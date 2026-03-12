/**
 * Scheduler Gatekeeper
 * Logic for time/day-based notification filtering.
 */
export const schedulerGatekeeper = {
    isAllowed: function (category, config) {
        if (!config || !config.gatekeeper || !config.gatekeeper[category]) return true;

        const rule = config.gatekeeper[category];
        if (rule.enabled === false) return false;

        const now = new Date();
        const day = now.getDay(); // 0=Sun, 6=Sat
        const time = parseInt(String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0'));

        // 1. Deny conditions first
        if (rule.deny && this._matchesRule(rule.deny, day, time)) {
            return false;
        }

        // 2. Allow conditions
        if (rule.allow && !this._matchesRule(rule.allow, day, time)) {
            return false;
        }

        return true;
    },

    _matchesRule: function (condition, currentDay, currentTime) {
        if (condition.days && !condition.days.includes(currentDay)) {
            return false;
        }
        if (condition.start && condition.end) {
            const start = parseInt(condition.start);
            const end = parseInt(condition.end);

            if (start <= end) {
                if (currentTime < start || currentTime > end) return false;
            } else {
                if (currentTime < start && currentTime > end) return false;
            }
        }
        return true;
    }
};
