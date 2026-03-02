/**
 * AEGIS Proactive Agent (v1.8.0 Plugin-X)
 */
export default {
    updateTimer: null,
    config: { check_interval_min: 5 },

    init: async function (shadowRoot, context) {
        context.log("Proactive Agent Initializing...");

        // 1. 설정 로드
        try {
            const res = await fetch('/api/plugins/proactive-agent/config');
            const serverConfig = await res.json();
            Object.assign(this.config, serverConfig);
        } catch (e) { }

        const checkProactiveTriggers = async () => {
            try {
                const res = await fetch('/api/plugins/proactive-agent/check');
                const data = await res.json();

                if (data.triggered) {
                    // 리액션 엔진에 이벤트 전달
                    context.triggerReaction('proactive', data, 0);
                }
            } catch (e) {
                console.error("[Proactive] Check failed:", e);
            }
        };

        // 2. 초기 기동 및 스케줄러 등록
        let tick = 0;
        context.registerSchedule('proactive_agent', 'min', () => {
            tick++;
            if (tick >= this.config.check_interval_min) {
                checkProactiveTriggers();
                tick = 0;
            }
        });
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        console.log("[Plugin-X] Proactive Agent Destroyed.");
    }
};
