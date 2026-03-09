/**
 * Plugin Context Provider
 * Creates a sandbox layers for plugins with specific capabilities.
 */
export const pluginContext = {
    create: function (manifest, shadowRoot) {
        return {
            log: (msg) => console.log(`[Plugin:${manifest.id}]`, msg),

            // Capability: Media Proxy
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

            // Capability: Terminal Command Registration
            registerCommand: (prefix, callback) => {
                if (window.CommandRouter) {
                    window.CommandRouter.register(prefix, callback);
                }
            },

            // Capability: Avatar Interaction
            triggerReaction: (type, data, timeout) => {
                if (window.reactionEngine) window.reactionEngine.checkAndTrigger(type, data, timeout);
            },

            speak: (text, audioUrl = null, visualType = 'none', speechText = null) => {
                if (typeof window.speakTTS === 'function') {
                    window.speakTTS(text, audioUrl, visualType, speechText);
                } else {
                    window.dispatchEvent(new CustomEvent('aegis:speak', {
                        detail: { text, audioUrl, visualType, speechText }
                    }));
                }
            },

            appendLog: (tag, message) => {
                if (typeof window.appendLog === 'function') window.appendLog(tag, message);
            },

            // Capability: Scheduling
            registerSchedule: (name, interval, callback) => {
                if (window.briefingScheduler) {
                    window.briefingScheduler.registerWidget(name, interval, callback);
                }
            },

            // Capability: Strategic Briefing
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
            },

            changeModel: (modelName) => {
                if (typeof window.loadModel === 'function') window.loadModel(modelName);
            },
            getActiveModel: () => window.activeModelName || 'hiyori_vts',

            // Capability: Environment Control
            environment: (manifest.permissions && manifest.permissions.includes('ENVIRONMENT_CONTROL')) ? {
                applyEffect: async (type) => {
                    if (!window.applyWeatherEffect) {
                        if (!document.getElementById('weather-effects-css')) {
                            const link = document.createElement('link');
                            link.id = 'weather-effects-css';
                            link.rel = 'stylesheet';
                            link.href = '/static/css/components/weather_effects.css';
                            document.head.appendChild(link);
                        }
                        await new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = '/static/js/weather_effects.js';
                            script.onload = resolve;
                            script.onerror = reject;
                            document.body.appendChild(script);
                        });
                    }
                    if (window.applyWeatherEffect) window.applyWeatherEffect(type);
                }
            } : null
        };
    }
};
