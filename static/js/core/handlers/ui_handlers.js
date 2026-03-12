/**
 * AEGIS MessageHandlers - UI & User Experience Domain (v4.2)
 * Handles visual feedback, reactions, briefing triggers, and widget lifecycle.
 */
export const UiHandlers = {
    'APPEND_LOG': async (data) => {
        if (window.Terminal) {
            window.Terminal.appendLog(data.tag, data.msg);
            return { success: true };
        }
        return { success: false };
    },

    'ENVIRONMENT_EFFECT': async (data) => {
        if (window.EnvironmentManager) {
            window.EnvironmentManager.applyEffect(data.effect);
            return { success: true };
        }
        return { success: false };
    },

    'TRIGGER_REACTION': async (data) => {
        if (window.reactionEngine) {
            window.reactionEngine.checkAndTrigger(data.type, data.data, data.timeout);
            return { success: true };
        }
        return { success: false };
    },

    'SPEAK': async (data, source, requestId, broker) => {
        console.log(`[UiHandlers] SPEAK request from ${source}:`, data);
        // [v4.1] Broadcast to all widgets (e.g., core-voice inside Iframe)
        broker.broadcast('SPEAK', data);
        return { success: true };
    },

    'REG_CMD': async (data, source, requestId, broker) => {
        if (window.CommandRouter) {
            window.CommandRouter.register(data.prefix, (args) => {
                broker.send(source, 'EXEC_CMD', { prefix: data.prefix, args });
            });
            return { success: true };
        }
        return { success: false };
    },

    'REGISTER_TTS_ICON': async (data) => {
        window.TTS_ICONS = window.TTS_ICONS || {};
        window.TTS_ICONS[data.type] = data.icon;
        return { success: true };
    },

    'TRIGGER_BRIEFING': async (data, source) => {
        if (window.BriefingService && window.BriefingService.trigger) {
            return await window.BriefingService.trigger(source, null, data.options);
        }
        return { status: 'error', message: 'BriefingService not available' };
    },

    'GET_MEDIA_LIST': async (data, source) => {
        try {
            const res = await window.fetch(`${window.AEGIS_BASE_URL || ''}/api/plugins/${source}/media/list`);
            return await res.json();
        } catch (e) {
            return [];
        }
    },

    'GET_ACTIVE_PLUGINS': async () => {
        if (window.PluginLoader) {
            return Array.from(window.PluginLoader.activePlugins.values()).map(p => p.manifest);
        }
        return [];
    },

    'OPEN_SCHEDULER': async (data, source, requestId, broker) => {
        // [v4.2] Legacy window.scheduler.open() is replaced by Widget Toggle
        const isVisible = window.panelVisibility && window.panelVisibility['scheduler'] === true;
        broker.coreHandlers['WIDGET_VISIBILITY_CHANGED']({ id: 'scheduler', visible: !isVisible });
        return { success: true };
    },

    'SET_PASSTHROUGH': async (data, source, requestId, broker) => {
        const targetIframe = document.getElementById(`iframe-${source}`);
        
        if (targetIframe) {
            targetIframe.style.pointerEvents = data.isPassthrough ? 'none' : 'auto';
            if (!data.isPassthrough) {
                setTimeout(() => targetIframe.focus(), 10);
            }
            return { success: true, isPassthrough: data.isPassthrough };
        } else {
            // Legacy/Fallback mapping
            const widgetWindow = broker.widgets.get(source);
            const fallbackIframe = Array.from(document.querySelectorAll('iframe'))
                .find(iframe => iframe.contentWindow === widgetWindow);

            if (fallbackIframe) {
                fallbackIframe.style.pointerEvents = data.isPassthrough ? 'none' : 'auto';
                return { success: true, isPassthrough: data.isPassthrough };
            }
            return { status: 'error', message: 'Iframe not found' };
        }
    },

    'WIDGET_VISIBILITY_CHANGED': async (data) => {
        const widgetEl = document.getElementById(data.id);
        if (widgetEl) {
            widgetEl.style.display = data.visible ? '' : 'none';
            if (data.visible) {
                const iframe = document.getElementById(`iframe-${data.id}`);
                if (iframe) setTimeout(() => iframe.focus(), 50);
            }
            if (window.panelVisibility) {
                window.panelVisibility[data.id] = data.visible;
                if (window.saveSettings) window.saveSettings();
            }
            return { success: true };
        } else if (data.visible && window.PluginLoader) {
            // [v4.2] Dynamic On-Demand Launch for Window/Unrendered Plugins
            if (window.PluginLoader.activePlugins.has(data.id)) {
                const active = window.PluginLoader.activePlugins.get(data.id);
                // [v4.2.2] Check if window is actually still open
                if (active.window && !active.window.closed) {
                    active.window.focus();
                    return { success: true, alreadyActive: true };
                }
                // If it was a window and it's closed, cleanup and proceed to re-launch
                window.PluginLoader.activePlugins.delete(data.id);
            }

            const manifest = window.PluginLoader.plugins.find(p => p.id === data.id);
            if (manifest) {
                console.log(`[UiHandlers] Dynamic launch for ${data.id}...`);
                await window.PluginLoader.renderer.render(manifest, window.PluginLoader.bundle);
                return { success: true, launched: true };
            }
        }
        return { success: false };
    },

    'PLAY_MOTION': async (data) => {
        if (typeof window.dispatchAvatarEvent === 'function') {
            window.dispatchAvatarEvent('MOTION', { alias: data.alias, file: data.file });
            return { success: true };
        }
        return { success: false };
    },

    'PLAY_EMOTION': async (data) => {
        if (typeof window.dispatchAvatarEvent === 'function') {
            window.dispatchAvatarEvent('EMOTION', { alias: data.alias, file: data.file, duration: data.duration });
            return { success: true };
        }
        return { success: false };
    },

    'LISTEN': async (data, source, requestId, broker) => {
        console.log(`[UiHandlers] Widget ${source} requested to LISTEN for: ${data.type}`);
        broker.on(data.type, (eventData, eventSource) => {
            // Forward the event to the requesting widget
            broker.send(source, data.type, eventData);
        });
        return { success: true, observed: data.type };
    }
};
