/**
 * AEGIS Plugin-X: Frontend Orchestrator (v1.6.8 Modularized)
 * Handles dynamic widget injection and capability context preparation.
 */

window.PluginLoader = {
    activePlugins: new Map(),

    /**
     * 메인 진입점: 등록된 모든 플러그인 로드 및 렌더링
     */
    /**
     * [v2.3.0] AEGIS Extreme Cache (AXC) - IndexedDB Interface
     */
    _db: {
        NAME: 'AEGIS_Plugin_Cache',
        STORE: 'packs',
        VERSION: 1,
        _instance: null,

        open: async function () {
            if (this._instance) return this._instance;
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.NAME, this.VERSION);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.STORE)) {
                        db.createObjectStore(this.STORE);
                    }
                };
                request.onsuccess = () => {
                    this._instance = request.result;
                    resolve(this._instance);
                };
                request.onerror = () => reject(request.error);
            });
        },

        get: async function (key) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.STORE, 'readonly');
                const request = transaction.objectStore(this.STORE).get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        set: async function (key, value) {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(this.STORE, 'readwrite');
                const request = transaction.objectStore(this.STORE).put(value, key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    },

    /**
     * 메인 진입점: 등록된 모든 플러그인 로드 및 렌더링
     */
    init: async function () {
        const bootStartTime = performance.now();
        console.log("%c[Plugin-X] AXC (AEGIS Extreme Cache) Boot Sequence Started...", "color: #00f2ff; font-weight: bold;");

        try {
            // 1. 네트워크 통신 (버전 체크)
            const networkStartTime = performance.now();
            const versionRes = await fetch(`/api/plugins/version?t=${Date.now()}`);
            const { version: serverVersion } = await versionRes.json();
            const networkDuration = performance.now() - networkStartTime;

            // 2. 자산 확보 (캐시 또는 서버)
            const assetStartTime = performance.now();
            let pack = null;
            let cacheHit = false;
            let missReason = "No Local Data";

            try {
                const localData = await this._db.get('init_pack');
                if (localData && localData.version === serverVersion) {
                    pack = localData.content;
                    cacheHit = true;
                } else if (localData) {
                    missReason = "Version Mismatch";
                }
            } catch (e) { missReason = "DB Error"; }

            if (!pack) {
                const res = await fetch(`/api/plugins/init_pack?t=${Date.now()}`);
                pack = await res.json();
                this._db.set('init_pack', { version: serverVersion, content: pack });
            }
            const assetDuration = performance.now() - assetStartTime;

            // [v2.4.5] 여기까지가 "시스템이 데이터를 준비한 시간" (이게 진짜 AXC의 성능)
            console.log(`%c[AXC Profile] Network: ${networkDuration.toFixed(1)}ms | AssetPrep: ${assetDuration.toFixed(1)}ms (Cache: ${cacheHit ? 'HIT' : 'MISS'})`, "color: #ff9f43;");

            const plugins = pack.plugins || [];
            this.bundle = pack.bundle || {};

            // 3. 로직 활성화 (UI 그리기 + JS 실행)
            const logicStartTime = performance.now();

            // 4. [v2.4.6] Parallel Hydration Fix:
            // DOM 구조(Wrapper 생성 및 Append)는 순차적으로 미리 수행하여 순서(Priority)를 보장하고,
            // 무거운 자산 로딩 및 로직 실행(Hydration)만 병렬로 수행합니다.
            const hydrations = [];
            for (const manifest of plugins) {
                if (manifest.hidden) continue;

                // (1) Sync: Wrapper 및 Shadow DOM 즉시 생성 (순서 고정)
                const wrapper = this._createPluginWrapper(manifest);
                if (wrapper) {
                    // (2) Async: 자산 주입 및 로직 실행 예약
                    hydrations.push(this._hydratePlugin(manifest, wrapper));
                }
            }

            // 모든 플러그인 동시 로딩 및 초기화
            await Promise.all(hydrations);

            const logicDuration = performance.now() - logicStartTime;
            const totalDuration = performance.now() - bootStartTime;

            // 4. 최종 결과 리포트
            const statusColor = cacheHit ? "#32ff7e" : "#ffb8b8";
            console.log(
                `%c[Plugin-X] Boot Finished %c Delivery: ${(networkDuration + assetDuration).toFixed(1)}ms | Execution: ${logicDuration.toFixed(1)}ms | Total: ${totalDuration.toFixed(1)}ms`,
                `background: ${statusColor}; color: #000; font-weight: bold; padding: 2px 5px;`,
                "color: #fff;"
            );

            if (window.logger) {
                window.logger.info(`[Performance] Boot:${totalDuration.toFixed(1)}ms (Net:${networkDuration.toFixed(1)}, Asset:${assetDuration.toFixed(1)}, Exec:${logicDuration.toFixed(1)})`);
            }
        } catch (e) {
            console.error("[Plugin-X] Initialization failed:", e);
        }
    },

    /**
     * [v2.4.6] Step 1: 위젯 래퍼 상자만 즉시 생성 (순서 고정용)
     */
    _createPluginWrapper: function (manifest) {
        try {
            const container = document.getElementById('ui-layer');
            if (!container) return null;

            const wrapper = document.createElement('div');
            wrapper.id = manifest.id;

            if (!manifest.layout?.fixed) {
                wrapper.className = 'glass-panel widget-panel';
                if (manifest.layout?.default_size) {
                    wrapper.classList.add(manifest.layout.default_size);
                }
            } else {
                wrapper.className = 'fixed-plugin-wrapper';
            }

            if (window.panelVisibility && window.panelVisibility[manifest.id] === false) {
                wrapper.style.display = 'none';
            }

            // Shadow DOM 미리 부착
            wrapper.attachShadow({ mode: 'open' });

            if (manifest.layout?.zIndex) {
                wrapper.style.zIndex = manifest.layout.zIndex;
            }

            // 위치 및 드래그 설정 (순서 보장을 위해 appendChild 전 수행)
            if (manifest.layout?.fixed) {
                wrapper.style.position = 'fixed';
                wrapper.style.top = '0';
                wrapper.style.left = '0';
                wrapper.style.width = '100vw';
                wrapper.style.height = '100vh';
                wrapper.style.margin = '0';
                wrapper.style.padding = '0';
                wrapper.style.pointerEvents = 'none';
                wrapper.classList.add('fixed-plugin');
            } else {
                if (window.initSinglePanelDragging) window.initSinglePanelDragging(wrapper);
                if (window.uiPositions && window.uiPositions[manifest.id]) {
                    const pos = window.uiPositions[manifest.id];
                    if (pos.leftRatio !== undefined) wrapper.style.left = (pos.leftRatio * window.innerWidth) + "px";
                    if (pos.topRatio !== undefined) wrapper.style.top = (pos.topRatio * window.innerHeight) + "px";
                    if (pos.width) wrapper.style.width = pos.width;
                    if (pos.height) wrapper.style.height = pos.height;
                } else {
                    const count = this.activePlugins.size;
                    wrapper.style.left = (100 + (count * 40)) + "px";
                    wrapper.style.top = (100 + (count * 40)) + "px";
                }
                wrapper.style.position = 'absolute';
            }

            if (window.uiLocked) wrapper.classList.add('locked');

            container.appendChild(wrapper);
            return wrapper;
        } catch (e) {
            console.error(`[Plugin-X] Wrapper creation failed for ${manifest.id}:`, e);
            return null;
        }
    },

    /**
     * [v2.4.6] Step 2: 생성된 래퍼에 자산 주입 및 로직 비동기 실행 (속도 최적화)
     */
    _hydratePlugin: async function (manifest, wrapper) {
        try {
            const shadow = wrapper.shadowRoot;
            if (!shadow) return;

            // 1. 자산 확보 (Bundle vs Fetch)
            let html = '';
            let css = '';
            let jsSource = null;
            const bundled = this.bundle ? this.bundle[manifest.id] : null;

            if (bundled) {
                html = bundled.html || '';
                css = bundled.css || '';
                jsSource = bundled.js || null;
            } else {
                html = manifest.entry.html ? await fetch(manifest.entry.html).then(r => r.text()) : '';
                css = manifest.entry.css ? await fetch(manifest.entry.css).then(r => r.text()) : '';
            }

            // 2. DOM 주입
            if (css) {
                const style = document.createElement('style');
                style.textContent = css;
                shadow.appendChild(style);
            }
            if (html) {
                const content = document.createElement('div');
                content.innerHTML = html;
                shadow.appendChild(content);
            }

            // 3. i18n
            if (window.I18nManager) window.I18nManager.applyShadowI18n(shadow);

            // 4. JS 로드 및 실행
            if (jsSource || manifest.entry.js) {
                let moduleUrl = manifest.entry.js;
                if (jsSource) {
                    const blob = new Blob([jsSource], { type: 'application/javascript' });
                    moduleUrl = URL.createObjectURL(blob);
                }

                try {
                    const module = await import(moduleUrl);
                    if (module.default && typeof module.default.init === 'function') {
                        const context = this.prepareContext(manifest, shadow);
                        module.default.init(shadow, context);
                        this.activePlugins.set(manifest.id, { manifest, module: module.default, shadow, context });
                    }
                } finally {
                    if (jsSource && moduleUrl.startsWith('blob:')) {
                        setTimeout(() => URL.revokeObjectURL(moduleUrl), 1000);
                    }
                }
            } else {
                this.activePlugins.set(manifest.id, { manifest, shadow });
            }

            // 5. 사이드바 및 전역 등록
            if (window.SidebarManager) window.SidebarManager.addSidebarItem(manifest);
            if (window.TTS_ICONS && manifest.icon) {
                window.TTS_ICONS[manifest.id] = manifest.icon;
            }

        } catch (err) {
            console.error(`[Plugin-X] Hydration failed for ${manifest.id}:`, err);
        }
    },

    /**
     * 플러그인 전용 보안 컨텍스트 생성 (Sandbox Layer)
     */
    prepareContext: function (manifest, shadowRoot) {
        return {
            log: (msg) => console.log(`[Plugin:${manifest.id}]`, msg),

            // Capability: Media Proxy (Plugin-X 기반 동적 경로)
            getMediaList: async () => {
                const res = await fetch(`/api/plugins/${manifest.id}/media/list`);
                return res.json();
            },
            getAudioUrl: (filename) => `/api/plugins/${manifest.id}/media/stream/${filename}`,

            // Capability: AI Gateway
            askAI: async (task, data) => {
                try {
                    const res = await fetch('/api/plugins/proxy/ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ plugin_id: manifest.id, task, data })
                    });

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
                        return { status: 'error', message: errorData.message || `Proxy error (${res.status})` };
                    }
                    return await res.json();
                } catch (e) {
                    return { status: 'error', message: e.message };
                }
            },

            // Capability: i18n
            _t: (key) => window._t ? window._t(key) : key,
            applyI18n: () => {
                if (window.I18nManager) window.I18nManager.applyShadowI18n(shadowRoot);
            },

            // Capability: TTS Icon Registration
            registerTtsIcon: (type, icon) => {
                if (window.TTS_ICONS) window.TTS_ICONS[type] = icon;
            },

            // Capability: Terminal Command Registration (Plugin-X Architecture)
            registerCommand: (prefix, callback) => {
                if (window.CommandRouter) {
                    window.CommandRouter.register(prefix, callback);
                }
            },


            // Capability: Avatar Interaction
            triggerReaction: (type, data, timeout) => {
                if (window.reactionEngine) window.reactionEngine.checkAndTrigger(type, data, timeout);
            },

            // [NEW] 전역 서비스 가교 (Bridge)
            speak: (text, audioUrl = null, visualType = 'none', speechText = null) => {
                if (typeof window.speakTTS === 'function') {
                    window.speakTTS(text, audioUrl, visualType, speechText);
                } else {
                    console.log(`[Plugin:${manifest.id}] Speech requested but service unavailable: ${text}`);
                }
            },

            appendLog: (tag, message) => {
                if (typeof window.appendLog === 'function') window.appendLog(tag, message);
            },

            // Capability: Scheduling (Briefing)
            registerSchedule: (name, interval, callback) => {
                if (window.briefingScheduler) {
                    window.briefingScheduler.registerWidget(name, interval, callback);
                }
            },

            // Capability: Strategic Briefing (Architecture v1.7.5)
            triggerBriefing: async (feedbackEl = null, options = {}) => {
                if (window.BriefingService) {
                    try {
                        return await window.BriefingService.trigger(manifest.id, feedbackEl, options);
                    } catch (e) {
                        return { status: 'error', message: e.message };
                    }
                }
                return { status: 'error', message: 'BriefingService not found' };
            },

            // Capability: Reaction Control
            reaction: {
                isCooldownActive: (type, cooldown, name) => {
                    return window.reactionEngine ? window.reactionEngine.isCooldownActive(type, cooldown, name) : false;
                },
                setCooldown: (type, name) => {
                    if (window.reactionEngine) window.reactionEngine.setCooldown(type, name);
                },
                trigger: (type, data, timeout) => {
                    if (window.reactionEngine) window.reactionEngine.checkAndTrigger(type, data, timeout);
                }
            },

            playMotion: (filename) => {
                if (typeof window.playMotionFile === 'function') window.playMotionFile(filename);
                else console.log(`[Plugin:${manifest.id}] Motion requested but service unavailable: ${filename}`);
            },

            // Capability: Model Switcher
            changeModel: (modelName) => {
                if (typeof window.loadModel === 'function') window.loadModel(modelName);
                else console.log(`[Plugin:${manifest.id}] Model load requested but service unavailable: ${modelName}`);
            },
            getActiveModel: () => window.activeModelName || 'hiyori_vts',

            // Capability: Environment Control (v1.9.0)
            environment: (manifest.permissions && manifest.permissions.includes('ENVIRONMENT_CONTROL')) ? {
                applyEffect: async (type) => {
                    // 동적 에셋 로딩 (코어 분리 정책)
                    if (!window.applyWeatherEffect) {
                        console.log(`[Plugin:${manifest.id}] Loading weather effects script...`);

                        // CSS 로드
                        if (!document.getElementById('weather-effects-css')) {
                            const link = document.createElement('link');
                            link.id = 'weather-effects-css';
                            link.rel = 'stylesheet';
                            link.href = '/static/css/components/weather_effects.css';
                            document.head.appendChild(link);
                        }

                        // JS 로드 (Promise 기반)
                        await new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = '/static/js/weather_effects.js';
                            script.onload = resolve;
                            script.onerror = reject;
                            document.body.appendChild(script);
                        });
                    }

                    if (window.applyWeatherEffect) {
                        window.applyWeatherEffect(type);
                    }
                }
            } : null
        };
    }
};
