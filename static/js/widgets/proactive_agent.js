/**
 * AEGIS Proactive Agent
 * Periodically checks for urgent triggers and alerts the user
 */

let proactiveInterval;

async function startProactiveAgent() {
    // 5분마다 체크 (설정에서 가져오거나 기본값 사용)
    const config = await (await fetch('/config/proactive')).json();
    const interval = (config.check_interval_min || 5) * 60 * 1000;

    if (window.briefingScheduler) {
        let tickCounter = 0;
        const intervalMin = config.check_interval_min || 5;

        window.briefingScheduler.registerWidget('proactive_agent', 'min', () => {
            tickCounter++;
            if (tickCounter >= intervalMin) {
                checkProactiveTriggers();
                tickCounter = 0;
            }
        });
    } else {
        proactiveInterval = setInterval(checkProactiveTriggers, interval);
    }
}

async function checkProactiveTriggers() {
    try {
        const res = await fetch('/proactive_check');
        const data = await res.json();

        if (data.triggered) {
            if (window.reactionEngine) {
                window.reactionEngine.checkAndTrigger('proactive', data, 0);
            }
        }
    } catch (e) {
        console.error("[Proactive] Check failed:", e);
    }
}

// 외부 노출
window.startProactiveAgent = startProactiveAgent;
