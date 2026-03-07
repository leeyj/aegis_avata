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
                context.log(">>> [Title] Briefing icon clicked.");
                console.log("[TitleWidget] Briefing trigger started.");

                // Apply pulse to icon for visual feedback
                briefingIcon.classList.add('loading-pulse');

                try {
                    context.log(">>> [Title] Requesting briefing from engine...");
                    const result = await context.triggerBriefing(briefingStatus);

                    console.log("[TitleWidget] Briefing result received:", result);
                    context.log(`<<< [Title] Engine responded with status: ${result.status}`);

                    if (!result || result.status === 'error') {
                        const errMsg = result ? (result.error || "AI Hub connectivity degraded.") : "AI Hub connectivity degraded.";
                        context.log(`!!! [Title] Briefing Error: ${errMsg}`);
                        context.speak(`SYSTEM_NOTICE: ${errMsg}`);
                    } else {
                        context.log(">>> [Title] Briefing successfully processed and spoken.");
                    }
                } catch (err) {
                    console.error("[TitleWidget] Fatal error during briefing:", err);
                    context.log("!!! [Title] Tactical aborted briefing: " + err.message);
                } finally {
                    briefingIcon.classList.remove('loading-pulse');
                    console.log("[TitleWidget] Briefing sequence finished.");
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
