/**
 * Scheduler Action Executor
 * Massive switch-case for routine actions.
 */
export const schedulerActions = {
    execute: async function (routine) {
        if (window.logger) window.logger.info(`[ActionExecutor] Executing ${routine.action} for ${routine.id}`);

        switch (routine.action) {
            case 'tactical_briefing':
                const titlePanel = document.getElementById('title');
                if (titlePanel) titlePanel.click();
                break;

            case 'widget_briefing':
                if (routine.target && typeof window.triggerWidgetBriefing === 'function') {
                    window.triggerWidgetBriefing(routine.target);
                }
                break;

            case 'speak':
                if (routine.text && typeof window.speakTTS === 'function') {
                    let ttsText = routine.text;
                    if (routine._sensorValue !== undefined) {
                        ttsText = ttsText.replace(/\{\{value\}\}/g, routine._sensorValue);
                        ttsText = ttsText.replace(/\{\{threshold\}\}/g, routine._sensorThreshold ?? '');
                    }
                    window.speakTTS(ttsText);
                }
                break;

            case 'reload':
                location.reload();
                break;

            case 'yt_play':
                if (typeof window.changeYTPlaylist === 'function' && routine.target) {
                    window.changeYTPlaylist(routine.target);
                } else if (typeof window.toggleYTPlay === 'function') {
                    window.toggleYTPlay(true);
                }
                break;

            case 'yt_stop':
                if (typeof window.toggleYTPlay === 'function') window.toggleYTPlay(false);
                break;

            case 'yt_volume':
                if (routine.volume !== undefined) this._fadeVolume(routine.volume);
                break;

            case 'wallpaper_set':
                if (window.WallpaperManager && routine.target) {
                    const isVideo = routine.target.toLowerCase().endsWith('.mp4') || routine.target.toLowerCase().endsWith('.webm');
                    window.WallpaperManager.updateConfig({ current: routine.target, is_video: isVideo, mode: 'static' });
                }
                break;

            case 'terminal_command':
                if (routine.command && window.CommandRouter) {
                    await window.CommandRouter.route(routine.command, "gemini");
                }
                break;

            case 'api_call':
                if (routine.url) this._apiCall(routine);
                break;

            default:
                if (routine.action && routine.action.startsWith('plugin:')) {
                    this._pluginAction(routine);
                }
        }
    },

    _fadeVolume: function (targetVolume, durationMs = 2000) {
        if (typeof window.setYTVolume !== 'function' || typeof window.ytVolume === 'undefined') return;

        const startVolume = window.ytVolume * 100;
        const steps = 10;
        const stepTime = durationMs / steps;
        const diff = targetVolume - startVolume;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            const nextVol = startVolume + (diff * (currentStep / steps));
            window.setYTVolume(nextVol);
            if (currentStep >= steps) clearInterval(interval);
        }, stepTime);
    },

    _apiCall: async function (routine) {
        try {
            const options = { method: routine.method || 'GET' };
            if (routine.body && options.method !== 'GET') {
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(routine.body);
            }
            const res = await fetch(routine.url, options);
            const data = await res.json();
            if (routine.speak_result && data.message && typeof window.speakTTS === 'function') {
                window.speakTTS(data.message);
            }
        } catch (e) {
            console.error(`[Scheduler] API call failed: ${routine.url}`, e);
        }
    },

    _pluginAction: function (routine) {
        if (!routine.plugin_payload) return;
        const payload = routine.plugin_payload;

        const processTemplate = (str) => {
            if (typeof str !== 'string') return str;
            let res = str;
            if (routine._sensorValue !== undefined) {
                res = res.replace(/\{\{value\}\}/g, routine._sensorValue);
                res = res.replace(/\{\{threshold\}\}/g, routine._sensorThreshold ?? '');
            }
            return res;
        };

        if (payload.type === 'terminal_command' && payload.command && window.CommandRouter) {
            window.CommandRouter.route(processTemplate(payload.command), "gemini");
        } else if (payload.type === 'api_call' && payload.url) {
            fetch(processTemplate(payload.url), { method: payload.method || 'GET' }).catch(e => console.error(e));
        }
    }
};
