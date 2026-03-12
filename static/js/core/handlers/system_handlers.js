/**
 * AEGIS MessageHandlers - System Domain (v4.2)
 * Handles core system state, settings, and model management.
 */
export const SystemHandlers = {
    'CHANGE_MODEL': async (data) => {
        if (typeof window.loadModel === 'function') {
            window.loadModel(data.modelId);
            return { success: true };
        }
        return { success: false, error: 'loadModel not found' };
    },

    'GET_ACTIVE_MODEL': async () => {
        return { modelId: window.activeModelName || null };
    },

    'GET_SYSTEM_STATE': async () => {
        return {
            isLocked: window.uiLocked || false,
            currentLang: window.currentLang || 'ko',
            isSponsor: window.IS_SPONSOR || false,
            panelVisibility: window.panelVisibility || {},
            lastAiEngine: window.activeAiEngine || 'gemini'
        };
    },

    'TOGGLE_LOCK': async () => {
        if (typeof window.toggleWidgetLock === 'function') {
            window.toggleWidgetLock();
            return { isLocked: window.uiLocked };
        } else {
            window.uiLocked = !window.uiLocked;
            if (window.saveSettings) window.saveSettings();
            return { isLocked: window.uiLocked };
        }
    },

    'SAVE_SETTINGS': async () => {
        if (window.saveSettings) {
            window.saveSettings();
            return { success: true };
        }
        return { success: false };
    },

    'CHANGE_LANGUAGE': async (data) => {
        if (window.I18nManager) {
            window.I18nManager.setLanguage(data.lang);
            return { success: true };
        }
        return { success: false };
    }
};
