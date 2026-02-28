/**
 * AEGIS Briefing Scheduler
 * Manages notification windows and scheduled routines.
 */
class BriefingScheduler {
    constructor() {
        this.config = null;
        this.lastRoutineExecution = {}; // { routineId: DateStr }
        this.isLoaded = false;
        this.widgets = []; // { id, type: 'min'|'sec', callback }
        this.tickInterval = null;
    }

    async init() {
        try {
            const res = await fetch('/scheduler_config');
            if (res.ok) {
                this.config = await res.json();
                this.isLoaded = true;
                this.startGlobalTick();
                console.log("[Scheduler] Initialized with Global Tick.");
            }
        } catch (e) {
            console.error("[Scheduler] Init failed:", e);
        }
    }

    /**
     * 특정 카테고리의 알림이 현재 허용되는지 확인 (Deny 우선)
     */
    isAllowed(category) {
        console.log("[Scheduler] Checking if category is allowed:", category);
        if (!this.isLoaded || !this.config || !this.config.gatekeeper || !this.config.gatekeeper[category]) return true;

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
     * 전역 틱 시스템 (v1.5)
     * 모든 위젯과 루틴을 하나의 타이머로 동기화합니다.
     */
    startGlobalTick() {
        if (this.tickInterval) clearInterval(this.tickInterval);

        this.tickInterval = setInterval(() => {
            const now = new Date();
            const secs = now.getSeconds();

            // 1. 매 초 실행 (초 단위 위젯: 시계 등)
            this.widgets.filter(w => w.type === 'sec').forEach(w => w.callback(now));

            // 2. 매 분 실행 (분 단위 위젯 및 루틴)
            if (secs === 0) {
                this.widgets.filter(w => w.type === 'min').forEach(w => w.callback(now));
                this.checkRoutines();
            }
        }, 1000);

        // 즉시 첫 회 실행
        const now = new Date();
        this.widgets.forEach(w => w.callback(now));
        this.checkRoutines();
    }

    /**
     * 전역 틱에 위젯 등록
     */
    registerWidget(id, type, callback) {
        // 중복 등록 방지
        this.widgets = this.widgets.filter(w => w.id !== id);
        this.widgets.push({ id, type, callback });
        console.log(`[Scheduler] Widget registered to Global Tick: ${id} (${type})`);
    }

    async checkRoutines() {
        if (!this.isLoaded || !this.config.routines) return;

        const now = new Date();
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentDay = now.getDay();
        const todayDateStr = now.toISOString().split('T')[0];

        for (const routine of this.config.routines) {
            if (!routine.enabled) continue;

            let shouldTrigger = false;

            // 1. 특정 시간 체크 (예: "09:00")
            if (routine.time === currentTimeStr) {
                shouldTrigger = true;
            }
            // 2. 정각 알림 체크 (매 시 00분)
            else if (routine.time === 'hourly' && now.getMinutes() === 0) {
                shouldTrigger = true;
            }

            if (shouldTrigger && routine.days.includes(currentDay)) {
                // 오늘/이번 시간에 이미 실행했는지 확인 (중복 실행 방지)
                // hourly의 경우 시간까지 포함하여 체크
                const executionKey = routine.time === 'hourly' ? `${todayDateStr}_${now.getHours()}` : todayDateStr;

                if (this.lastRoutineExecution[routine.id] !== executionKey) {
                    console.log(`[Scheduler] Triggering routine: ${routine.name}`);
                    this.executeAction(routine);
                    this.lastRoutineExecution[routine.id] = executionKey;
                }
            }
        }
    }

    /**
     * 루틴 액션 실행
     */
    async executeAction(routine) {
        if (window.logger) window.logger.info(`[Scheduler] Executing action: ${routine.action} for ${routine.id}`);

        switch (routine.action) {
            case 'tactical_briefing':
                const titlePanel = document.getElementById('p-title');
                if (titlePanel) titlePanel.click();
                break;

            case 'widget_briefing':
                if (routine.target && typeof triggerWidgetBriefing === 'function') {
                    triggerWidgetBriefing(routine.target);
                }
                break;

            case 'speak':
                if (routine.text && typeof speakTTS === 'function') {
                    speakTTS(routine.text);
                }
                break;

            case 'reload':
                location.reload();
                break;

            // --- v1.5 New Actions ---
            case 'yt_play':
                if (typeof window.changeYTPlaylist === 'function' && routine.target) {
                    window.changeYTPlaylist(routine.target);
                } else if (typeof window.toggleYTPlay === 'function') {
                    window.toggleYTPlay(true);
                }
                break;

            case 'yt_stop':
                if (typeof window.toggleYTPlay === 'function') {
                    window.toggleYTPlay(false);
                }
                break;

            case 'yt_volume':
                if (routine.volume !== undefined) {
                    this._fadeVolume(routine.volume);
                }
                break;

            case 'wallpaper_set':
                if (window.WallpaperManager && routine.target) {
                    const isVideo = routine.target.toLowerCase().endsWith('.mp4') || routine.target.toLowerCase().endsWith('.webm');
                    window.WallpaperManager.updateConfig({
                        current: routine.target,
                        is_video: isVideo,
                        mode: 'static'
                    });
                }
                break;

            default:
                if (window.logger) window.logger.warn(`[Scheduler] Unknown action: ${routine.action}`);
        }
    }

    /**
     * 유튜브 뮤직 볼륨을 부드럽게 조절 (Fade In/Out)
     */
    _fadeVolume(targetVolume, durationMs = 2000) {
        if (typeof window.setYTVolume !== 'function' || typeof ytVolume === 'undefined') return;

        const startVolume = ytVolume * 100; // 0~100 scale
        const steps = 10;
        const stepTime = durationMs / steps;
        const diff = targetVolume - startVolume;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            const nextVol = startVolume + (diff * (currentStep / steps));
            window.setYTVolume(nextVol);
            if (currentStep >= steps) clearInterval(interval);
        }, stepTime);
    }
}

// 전역 인스턴스 생성
window.briefingScheduler = new BriefingScheduler();
window.briefingScheduler.init();
