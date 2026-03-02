/**
 * AEGIS Plugin-X Title Widget
 * Enhanced v2.0 with decoupled status feedback.
 */
export default {
    /**
     * @param {ShadowRoot} shadowRoot 
     * @param {object} context 
     */
    init: function (shadowRoot, context) {
        context.log("Title Widget v1.8.7 [Premium] - Online.");

        const briefingIcon = shadowRoot.getElementById('briefing-icon');
        const briefingStatus = shadowRoot.getElementById('briefing-status');
        const titleEl = shadowRoot.getElementById('main-title');

        if (briefingIcon) {
            briefingIcon.onclick = async (e) => {
                e.stopPropagation();
                context.log("Briefing icon trigger initiated.");

                // Apply pulse to icon for visual feedback
                briefingIcon.classList.add('loading-pulse');

                try {
                    // Pass status element to triggerBriefing for text feedback
                    const result = await context.triggerBriefing(briefingStatus);
                    context.log("Briefing engine response recorded.");

                    if (!result || result.status === 'error') {
                        context.speak("SYSTEM_NOTICE: AI Hub connectivity degraded.");
                    }
                } catch (err) {
                    context.log("Tactically aborted briefing: " + err.message);
                } finally {
                    briefingIcon.classList.remove('loading-pulse');
                }
            };
        }

        // Title text interaction
        if (titleEl) {
            titleEl.style.cursor = 'help';
            titleEl.onclick = () => {
                context.speak("AEGIS TACTICAL CORE v4.8: System Stability Confirmed.");
            };
        }
    }
};
