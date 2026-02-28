/**
 * AEGIS Briefing Scheduler
 * Manages notification windows and scheduled routines.
 */
class BriefingScheduler {
    constructor() {
        this.config = null;
        this.lastRoutineExecution = {}; // { routineId: DateStr }
        this.isLoaded = false;
    }

    async init() {
        try {
            const res = await fetch('/scheduler_config');
            if (res.ok) {
                this.config = await res.json();
                this.isLoaded = true;
                this.startRoutineTick();
                console.log("[Scheduler] Initialized.");
            }
        } catch (e) {
            console.error("[Scheduler] Init failed:", e);
        }
    }

    /**
     * 특정 카테고리의 알림이 현재 허용되는지 확인 (Deny 우선)
     */
    isAllowed(category) {
        if (!this.isLoaded || !this.config || !this.config.gatekeeper[category]) return true;

        const rule = this.config.gatekeeper[category];
        if (rule.enabled === false) return false;

        const now = new Date();
        const day = now.getDay(); // 0=일, 6=토
        const time = parseInt(String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0'));

        // 1. Deny 조건 먼저 체크
        if (rule.deny && this._matchesRule(rule.deny, day, time)) {
            return false;
        }

        // 2. Allow 조건 체크
        if (rule.allow && !this._matchesRule(rule.allow, day, time)) {
            return false;
        }

        return true;
    }

    _matchesRule(condition, currentDay, currentTime) {
        // 요일 체크
        if (condition.days && !condition.days.includes(currentDay)) {
            return false;
        }
        // 시간 범위 체크
        if (condition.start && condition.end) {
            const start = parseInt(condition.start);
            const end = parseInt(condition.end);

            if (start <= end) {
                // 일반적인 시간 범위 (예: 0900 ~ 1800)
                if (currentTime < start || currentTime > end) {
                    return false;
                }
            } else {
                // 자정을 넘기는 시간 범위 (예: 2200 ~ 0400)
                // 현재 시간이 start보다 크거나, end보다 작으면 범위 안에 있는 것임
                if (currentTime < start && currentTime > end) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 매 분마다 등록된 루틴(정기 브리핑 등)이 있는지 확인
     */
    startRoutineTick() {
        setInterval(() => this.checkRoutines(), 60000);
        // 즉시 한 번 실행
        this.checkRoutines();
    }

    async checkRoutines() {
        if (!this.isLoaded || !this.config.routines) return;

        const now = new Date();
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentDay = now.getDay();
        const todayDateStr = now.toISOString().split('T')[0];

        for (const routine of this.config.routines) {
            if (!routine.enabled) continue;

            // 요일 및 시간 일치 확인
            if (routine.days.includes(currentDay) && routine.time === currentTimeStr) {
                // 오늘 이미 실행했는지 확인 (중복 실행 방지)
                if (this.lastRoutineExecution[routine.id] !== todayDateStr) {
                    console.log(`[Scheduler] Triggering routine: ${routine.name}`);
                    this.executeAction(routine);
                    this.lastRoutineExecution[routine.id] = todayDateStr;
                }
            }
        }
    }

    /**
     * 루틴 액션 실행
     */
    async executeAction(routine) {
        if (routine.action === 'tactical_briefing') {
            const titlePanel = document.getElementById('p-title');
            if (titlePanel) titlePanel.click();
        } else if (routine.action === 'widget_briefing' && routine.target) {
            if (typeof triggerWidgetBriefing === 'function') {
                triggerWidgetBriefing(routine.target);
            }
        } else if (routine.action === 'speak' && routine.text) {
            if (typeof speakTTS === 'function') {
                speakTTS(routine.text);
            }
        } else if (routine.action === 'reload') {
            location.reload();
        }
    }
}

// 전역 인스턴스 생성
window.briefingScheduler = new BriefingScheduler();
window.briefingScheduler.init();
