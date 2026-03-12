/**
 * AEGIS Plugin-X Title Widget
 * Enhanced v2.0 with decoupled status feedback.
 */
export default {
    /**
     * @param {ShadowRoot} shadowRoot 
     * @param {object} context 
     */
    init: function (root, context) {
        context.log("Title Widget v4.0 [Level 1] - Online.");

        const briefingIcon = root.getElementById('briefing-icon');
        const briefingStatus = root.getElementById('briefing-status');
        const titleEl = root.getElementById('main-title');

        // [v4.0] Core status sync
        context.on('CORE_STATUS_UPDATE', (data) => {
            if (data.title && titleEl) titleEl.innerText = data.title;
        });

        if (briefingIcon) {
            briefingIcon.onclick = async (e) => {
                e.stopPropagation();
                // ...existing briefing logic (already uses context.triggerBriefing)
                briefingIcon.classList.add('loading-pulse');
                try {
                    const result = await context.triggerBriefing(briefingStatus);
                    if (!result || result.status === 'error') {
                        context.speak(`SYSTEM_NOTICE: ${result?.message || "Briefing failed"}`);
                    }
                } finally {
                    briefingIcon.classList.remove('loading-pulse');
                }
            };
        }

        if (titleEl) {
            titleEl.style.cursor = 'help';
            titleEl.onclick = () => {
                context.speak("AEGIS TACTICAL CORE v4.0: Level 1 Sandbox Confirmed.");
            };
        }
    }
};
