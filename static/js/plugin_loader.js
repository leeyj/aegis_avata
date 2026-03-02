/**
 * AEGIS Plugin-X: Frontend Orchestrator (v1.6.8 Modularized)
 * Handles dynamic widget injection and capability context preparation.
 */

window.PluginLoader = {
    activePlugins: new Map(),

    /**
     * 메인 진입점: 등록된 모든 플러그인 로드 및 렌더링
     */
    init: async function () {
        try {
            const response = await fetch('/api/plugins/active');
            const plugins = await response.json();

            for (const manifest of plugins) {
                await this.loadPlugin(manifest);
            }
            console.log(`[Plugin-X] ${plugins.length} external plugins loaded.`);
        } catch (e) {
            console.error("[Plugin-X] Initialization failed:", e);
        }
    },

    /**
     * 단일 플러그인 로드 및 Shadow DOM 주입
     */
    loadPlugin: async function (manifest) {
        if (manifest.hidden) return; // [Plugin-X] UI Panel creation skipped for hidden plugins
        try {
            const container = document.getElementById('ui-layer');
            if (!container) return;

            // 1. 위젯 래퍼 생성
            const wrapper = document.createElement('div');
            wrapper.id = manifest.id;
            wrapper.className = 'glass-panel widget-panel';
            if (manifest.layout?.default_size) {
                wrapper.classList.add(manifest.layout.default_size);
            }

            // [Persistence] 가시성 상태 복구
            if (window.panelVisibility && window.panelVisibility[manifest.id] === false) {
                wrapper.style.display = 'none';
            }

            // 2. Shadow DOM 생성 (스타일 격리)
            const shadow = wrapper.attachShadow({ mode: 'open' });

            // 3. 자산 로드 (HTML / CSS / JS)
            const html = manifest.entry.html ? await fetch(manifest.entry.html).then(r => r.text()) : '';
            const css = manifest.entry.css ? await fetch(manifest.entry.css).then(r => r.text()) : '';

            // [CSS 주입]
            if (css) {
                const style = document.createElement('style');
                style.textContent = css;
                shadow.appendChild(style);
            }

            // [HTML 주입]
            if (html) {
                const content = document.createElement('div');
                content.innerHTML = html;
                shadow.appendChild(content);
            }

            // [i18n 처리] Shadow DOM 내부는 수동 트리거 필요
            if (window.I18nManager) window.I18nManager.applyShadowI18n(shadow);

            container.appendChild(wrapper);

            // 4. 드래그 기능 및 저장된 위치 적용 (Plugin-X 동적 바인딩)
            if (window.initSinglePanelDragging) window.initSinglePanelDragging(wrapper);
            if (window.uiPositions && window.uiPositions[manifest.id]) {
                const pos = window.uiPositions[manifest.id];
                if (pos.leftRatio !== undefined) wrapper.style.left = (pos.leftRatio * window.innerWidth) + "px";
                if (pos.topRatio !== undefined) wrapper.style.top = (pos.topRatio * window.innerHeight) + "px";
                if (pos.width) wrapper.style.width = pos.width;
                if (pos.height) wrapper.style.height = pos.height;
            } else {
                // [Plugin-X] 자동 스태거(Stagger) 배치 - 위젯 겹침 방지
                const count = this.activePlugins.size;
                wrapper.style.left = (100 + (count * 40)) + "px";
                wrapper.style.top = (100 + (count * 40)) + "px";
            }
            wrapper.style.position = 'absolute';

            // [Persistence] UI 잠금 상태 동기화
            if (window.uiLocked) {
                wrapper.classList.add('locked');
            }

            // 5. JS 모듈 실행 및 컨텍스트 주입
            if (manifest.entry.js) {
                const module = await import(manifest.entry.js);
                if (module.default && typeof module.default.init === 'function') {
                    const context = this.prepareContext(manifest, shadow);
                    module.default.init(shadow, context);
                    this.activePlugins.set(manifest.id, { manifest, module: module.default, shadow, context });
                }
            } else {
                this.activePlugins.set(manifest.id, { manifest, shadow });
                console.log(`[Plugin-X] Plugin ${manifest.id} loaded without JS module.`);
            }

            // 5. 사이드바 항목 추가 (SidebarManager 위임)
            if (window.SidebarManager) window.SidebarManager.addSidebarItem(manifest);

        } catch (err) {
            console.error(`[Plugin-X] Failed to load plugin ${manifest.id}:`, err);
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
                const res = await fetch('/api/plugins/proxy/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plugin_id: manifest.id, task, data })
                });
                return res.json();
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
                    return await window.BriefingService.trigger(manifest.id, feedbackEl, options);
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
