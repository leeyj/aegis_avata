/**
 * Plugin Context Provider (v4.0 Hybrid)
 * Detects environment (Iframe vs Shadow DOM) and abstracts communications.
 */
export const pluginContext = {
    create: function (manifest) {
        let broker = window.messageBroker;

        // [v4.0] Iframe Bridge: Always used in v4.0 Full Iframe pivot
        if (!broker) {
            const pendingRequests = new Map();
            window.addEventListener('message', (e) => {
                const message = e.data;
                if (message && message.requestId && pendingRequests.has(message.requestId)) {
                    const { resolve } = pendingRequests.get(message.requestId);
                    pendingRequests.delete(message.requestId);
                    resolve(message.data);
                }
            });

            const getBridgeTarget = () => window.opener || window.parent;

            broker = {
                on: (type, callback) => {
                    // [v4.2.3] Notify Core that we want to keep listening for this event type
                    getBridgeTarget().postMessage({
                        source: manifest.id,
                        target: 'core',
                        type: 'LISTEN',
                        data: { type: type }
                    }, '*');
                    
                    window.addEventListener('message', (e) => {
                        if (e.data.type === type) callback(e.data.data, e.data.source, e.data.type, e.data.requestId);
                    });
                },
                request: (target, type, data) => {
                    const requestId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
                    return new Promise((resolve, reject) => {
                        pendingRequests.set(requestId, { resolve, reject });
                        getBridgeTarget().postMessage({
                            source: manifest.id,
                            target: target,
                            type: type,
                            data: data,
                            requestId: requestId
                        }, '*');

                        setTimeout(() => {
                            if (pendingRequests.has(requestId)) {
                                pendingRequests.delete(requestId);
                                reject(new Error(`Bridge Request Timeout: ${type}`));
                            }
                        }, 10000); 
                    });
                },
                send: (target, type, data) => {
                    getBridgeTarget().postMessage({
                        source: manifest.id,
                        target: target,
                        type: type,
                        data: data
                    }, '*');
                }
            };
        }

        const getBridgeTarget = () => window.opener || window.parent;

        // Base context for capabilities
        const context = {
            id: manifest.id,
            manifest: manifest,
            isIframe: true, // Legacy compatibility
            isStandalone: !!window.opener,
            messageBroker: broker,
            resolve: (path) => {
                const origin = window.ORIGIN || "";
                if (!path) return "";
                if (path.startsWith('http') || path.startsWith('blob:')) return path;
                if (path.startsWith('/')) return origin + path;
                return `${origin}/api/plugins/assets/${manifest.id}/${path}`;
            },

            log: (msg) => {
                broker.send('core', 'LOG', msg);
            },

            // Capability: AI Gateway
            askAI: async (task, data) => {
                const proxyToken = manifest.proxy_token;
                return await broker.request('core', 'REQ_AI', { task, data, proxy_token: proxyToken });
            },

            // Capability: Terminal Command Registration
            registerCommand: (prefix, callback) => {
                broker.send('core', 'REG_CMD', { prefix });
                // Listen for command execution from Core
                window.addEventListener('message', (e) => {
                    if (e.data.type === 'EXEC_CMD' && e.data.prefix === prefix) {
                        callback(e.data.args);
                    }
                });
            },

            // Capability: Avatar & Interaction
            triggerReaction: (type, data, timeout) => {
                broker.send('core', 'TRIGGER_REACTION', { type, data, timeout });
            },

            appendLog: (tag, msg) => {
                broker.send('core', 'APPEND_LOG', { tag, msg });
            },

            environment: {
                applyEffect: (effect) => {
                    broker.send('core', 'ENVIRONMENT_EFFECT', { effect });
                }
            },

            speak: (text, audioUrl = null, visualType = 'none', speechText = null) => {
                broker.send('core', 'SPEAK', { text, audioUrl, visualType, speechText });
            },
// ... (rest of the file using getBridgeTarget where window.parent was used)

            // Capability: Model Management
            getActiveModel: async () => {
                return await broker.request('core', 'GET_ACTIVE_MODEL', {});
            },

            changeModel: (modelId) => {
                broker.send('core', 'CHANGE_MODEL', { modelId });
            },

            getAiEngine: async () => {
                return await broker.request('core', 'GET_AI_ENGINE', {});
            },

            changeAiEngine: (engineId) => {
                broker.send('core', 'CHANGE_AI_ENGINE', { engineId });
            },

            playMotion: (alias) => {
                broker.send('core', 'PLAY_MOTION', { alias });
            },

            // Capability: i18n
            _t: (key) => {
                if (!window.i18nData) return key;
                const keys = key.split('.');
                let current = window.i18nData;
                for (const k of keys) {
                    if (current && current[k] !== undefined) {
                        current = current[k];
                    } else {
                        return key;
                    }
                }
                return current;
            },

            applyI18n: (root = document) => {
                const elements = root.querySelectorAll('[data-i18n]');
                elements.forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    const translation = context._t(key);
                    if (translation === key) return;

                    if (key.startsWith('[') && key.includes(']')) {
                        const attr = key.substring(1, key.indexOf(']'));
                        const realKey = key.substring(key.indexOf(']') + 1);
                        el.setAttribute(attr, context._t(realKey));
                    } else if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
                        el.value = translation;
                    } else if (el.tagName === 'INPUT' && el.placeholder) {
                        el.placeholder = translation;
                    } else {
                        el.textContent = translation;
                    }
                });
            },

            // --- v4.0 Extensions ---
            on: (type, callback) => {
                broker.on(type, callback);
            },

            send: (target, type, data) => {
                broker.send(target, type, data);
            },

            request: async (target, type, data) => {
                return await broker.request(target, type, data);
            },

            requestCore: async (type, data) => {
                return await broker.request('core', type, data);
            },

            getSystemState: async () => {
                return await broker.request('core', 'GET_SYSTEM_STATE', {});
            },

            registerTtsIcon: (type, icon) => {
                broker.send('core', 'REGISTER_TTS_ICON', { type, icon });
            },

            triggerBriefing: async (feedbackEl, options) => {
                return await broker.request('core', 'TRIGGER_BRIEFING', { options });
            },

            getMediaList: async () => {
                return await broker.request('core', 'GET_MEDIA_LIST', { plugin_id: manifest.id });
            },

            getAudioUrl: (filename) => {
                return `/api/plugins/${manifest.id}/media/stream/${encodeURIComponent(filename)}`;
            },

            // --- v4.0 Level 3 Extensions (Phase 3) ---
            fetch: async (url, options = {}) => {
                const proxyToken = manifest.proxy_token;

                // Helper to create Response-like object
                const wrapResponse = (data, ok = true) => ({
                    ok: ok,
                    json: async () => data,
                    text: async () => typeof data === 'string' ? data : JSON.stringify(data),
                    blob: async () => new Blob([JSON.stringify(data)], { type: 'application/json' })
                });

                // Route all fetches through Core to bypass Sandbox/SOP
                // [v4.0] Phase 4: Auto-prefix relative URLs with plugin API path
                let targetUrl = url;
                if (!url.startsWith('http') && !url.startsWith('/')) {
                    targetUrl = `/api/plugins/${manifest.id}/${url}`;
                }

                try {
                    const data = await broker.request('core', 'FETCH', { url: targetUrl, options, proxy_token: proxyToken });
                    return wrapResponse(data);
                } catch (e) {
                    return wrapResponse({ status: 'error', message: e.message }, false);
                }
            },

            onSystemEvent: (cmd, callback) => {
                context.on('SYSTEM_EVENT', (data) => {
                    const eventCmd = data.command || data.cmd;
                    if (eventCmd === cmd) callback(data);
                });
            },

            registerSchedule: (name, unit, callback) => {
                // [v4.0] All schedules are now bridged to Core for persistence
                broker.send('core', 'REG_SCHEDULE', { name, unit });
                context.on('EXEC_SCHEDULE', (data) => {
                    if (data.name === name) callback();
                });
            }
        };

        // [v4.1] Cross-Iframe Mouse Gaze Tracking
        let lastMove = 0;
        window.addEventListener('pointermove', (e) => {
            const now = Date.now();
            if (now - lastMove < 50) return; // 20fps throttling
            lastMove = now;

            // console.log(`[PluginContext:${manifest.id}] Captured pointermove: ${e.clientX}, ${e.clientY}`);

            broker.send('core', 'IFRAME_POINTER_MOVE', {
                clientX: e.clientX,
                clientY: e.clientY
            });
        }, true); // USE CAPTURE PHASE to ensure we catch events before children stop propagation

        // [v4.1] Avatar Interaction Bridging (Drag & Zoom)
        window.addEventListener('pointerdown', (e) => {
            // [UX] Ignore right-click as it's handled locally or for context menus
            if (e.button !== 0) return;
            
            // [v4.2.6] Do not bridge dragging if the user is interacting with an internal draggable UI element
            // such as the speech bubble, or normal inputs.
            const target = e.target;
            if (target.closest && target.closest('.speech-bubble, button, input, textarea, select, .interactive')) return;

            broker.send('core', 'IFRAME_POINTER_DOWN', {
                clientX: e.clientX,
                clientY: e.clientY
            });
        }, true);

        window.addEventListener('pointerup', (e) => {
            broker.send('core', 'IFRAME_POINTER_UP', {});
        }, true);

        window.addEventListener('wheel', (e) => {
            // Check if scrollable - common UX pattern
            const isScrollable = (el) => {
                if (!el || el === document.body) return false;
                const style = window.getComputedStyle(el);
                const overflow = style.overflowY;
                if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) return true;
                return isScrollable(el.parentElement);
            };
            
            if (isScrollable(e.target)) return; // Allow internal scrolling

            // [Hotfix] Passive event listener cannot preventDefault, but we need to stop bubbling if handled
            broker.send('core', 'IFRAME_WHEEL', {
                deltaY: e.deltaY
            });
        }, { capture: true, passive: true });

        // [v4.1] Origin Debug
        console.log(`[PluginContext:${manifest.id}] ORIGIN: ${window.ORIGIN}, location.origin: ${window.location.origin}`);

        // Bridge to parent/opener for direct messages
        context.bridgeTarget = getBridgeTarget();

        return context;
    }
};
