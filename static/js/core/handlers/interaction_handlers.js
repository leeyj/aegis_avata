/**
 * AEGIS MessageHandlers - Interaction & Event Bridging Domain (v4.2)
 * Handles cross-iframe pointer events, mouse wheel, and avatar tracking.
 */
export const InteractionHandlers = {
    'IFRAME_POINTER_MOVE': async (data, source) => {
        const iframe = document.getElementById(`iframe-${source}`);
        if (iframe) {
            const rect = iframe.getBoundingClientRect();
            const globalX = rect.left + data.clientX;
            const globalY = rect.top + data.clientY;
            
            if (window.enableLookAtCursor && window.currentAvatar) {
                window.currentAvatar.focus(globalX, globalY);
            }

            // Cross-Iframe Dragging Logic
            if (window.isDraggingCanvas) {
                if (typeof window.lastMouseX !== 'undefined') {
                    window.offsetX += (globalX - window.lastMouseX);
                    window.offsetY += (globalY - window.lastMouseY);
                }
                window.lastMouseX = globalX;
                window.lastMouseY = globalY;

                if (typeof window._lastAdjust === 'function') window._lastAdjust();
                if (typeof window.saveSettings === 'function') window.saveSettings();
            }
        }
        return null; // One-way event, no response needed
    },

    'IFRAME_POINTER_DOWN': async (data, source) => {
        const iframe = document.getElementById(`iframe-${source}`);
        if (iframe && !window.uiLocked) {
            const rect = iframe.getBoundingClientRect();
            window.isDraggingCanvas = true;
            window.lastMouseX = rect.left + data.clientX;
            window.lastMouseY = rect.top + data.clientY;
        }
        return null;
    },

    'IFRAME_POINTER_UP': async () => {
        window.isDraggingCanvas = false;
        return null;
    },

    'IFRAME_WHEEL': async (data) => {
        if (!window.uiLocked) {
            window.userZoom = Math.min(Math.max(0.1, window.userZoom + (data.deltaY > 0 ? -0.1 : 0.1)), 5.0);
            if (typeof window._lastAdjust === 'function') window._lastAdjust();
            if (typeof window.saveSettings === 'function') window.saveSettings();
        }
        return null;
    }
};
