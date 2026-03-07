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
        if (this.isLoaded) return;
        try {
            const res = await fetch('/api/plugins/scheduler/config');
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
            if (!routine.days.includes(currentDay)) continue;

            // --- 조건 감시 루틴 (v1.8) ---
            if (routine.condition && (routine.time === 'every_1m' || routine.time === 'condition')) {
                await this._checkConditionRoutine(routine, now);
                continue;
            }

            // --- 시간 기반 루틴 (기존) ---
            let shouldTrigger = false;

            // 1. 특정 시간 체크 (예: "09:00")
            if (routine.time === currentTimeStr) {
                shouldTrigger = true;
            }
            // 2. 정각 알림 체크 (매 시 00분)
            else if (routine.time === 'hourly' && now.getMinutes() === 0) {
                shouldTrigger = true;
            }

            if (shouldTrigger) {
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
     * 조건 감시 루틴 체크 (v1.8)
     * API를 폴링하고, 조건 충족 시 액션 실행. 쿨다운 적용.
     */
    async _checkConditionRoutine(routine, now) {
        const cond = routine.condition;
        if (!cond || !cond.source || !cond.field) {
            console.warn(`[Watch] "${routine.name}" — condition 누락:`, cond);
            return;
        }

        // 쿨다운 체크
        const cooldownMs = (routine.cooldown_min || 30) * 60 * 1000;
        const lastExec = this.lastRoutineExecution[routine.id];
        if (lastExec && (now.getTime() - lastExec) < cooldownMs) {
            const remaining = Math.ceil((cooldownMs - (now.getTime() - lastExec)) / 60000);
            console.log(`[Watch] "${routine.name}" — 쿨다운 중 (${remaining}분 남음)`);
            return;
        }

        try {
            console.log(`[Watch] "${routine.name}" — 폴링: ${cond.source}`);
            const res = await fetch(cond.source);
            if (!res.ok) {
                console.warn(`[Watch] "${routine.name}" — API 응답 실패: ${res.status}`);
                return;
            }
            const data = await res.json();
            console.log(`[Watch] "${routine.name}" — API 응답:`, data);

            // 중첩 필드 지원 (예: "data.temp")
            let actualValue = data;
            for (const key of cond.field.split('.')) {
                actualValue = actualValue?.[key];
            }

            if (actualValue === undefined || actualValue === null) {
                console.warn(`[Watch] "${routine.name}" — 필드 "${cond.field}" 값 없음 (undefined/null)`);
                return;
            }

            // 센서 type 기반 값 변환 (manifest의 exports.sensors.type 참조)
            const sensorType = cond.type || 'number';
            if (sensorType === 'number' && typeof actualValue !== 'number') {
                const parsed = parseFloat(actualValue);
                if (!isNaN(parsed)) {
                    console.log(`[Watch] "${routine.name}" — 타입 변환(${sensorType}): "${actualValue}" → ${parsed}`);
                    actualValue = parsed;
                }
            } else if (sensorType === 'boolean') {
                actualValue = Boolean(actualValue);
            }
            // string 타입은 변환 불필요

            // 조건 평가
            const targetValue = cond.value;
            let matched = false;

            switch (cond.operator) {
                case '>=': matched = actualValue >= targetValue; break;
                case '<=': matched = actualValue <= targetValue; break;
                case '>': matched = actualValue > targetValue; break;
                case '<': matched = actualValue < targetValue; break;
                case '==': matched = actualValue == targetValue; break;
                case '!=': matched = actualValue != targetValue; break;
            }

            console.log(`[Watch] "${routine.name}" — ${cond.field}=${actualValue} ${cond.operator} ${targetValue} → ${matched ? '✅ 충족' : '❌ 미충족'}`);

            if (matched) {
                routine._sensorValue = actualValue;
                routine._sensorThreshold = targetValue;
                this.executeAction(routine);
                this.lastRoutineExecution[routine.id] = now.getTime();
            }
        } catch (e) {
            console.error(`[Watch] "${routine.name}" — 폴링 에러:`, e);
        }
    }

    /**
     * 루틴 액션 실행
     */
    async executeAction(routine) {
        if (window.logger) window.logger.info(`[Scheduler] Executing action: ${routine.action} for ${routine.id}`);

        switch (routine.action) {
            case 'tactical_briefing':
                const titlePanel = document.getElementById('title');
                if (titlePanel) titlePanel.click();
                break;

            case 'widget_briefing':
                if (routine.target && typeof triggerWidgetBriefing === 'function') {
                    triggerWidgetBriefing(routine.target);
                }
                break;

            case 'speak':
                if (routine.text && typeof speakTTS === 'function') {
                    // 템플릿 변수 치환: {{value}}, {{threshold}}
                    let ttsText = routine.text;
                    if (routine._sensorValue !== undefined) {
                        ttsText = ttsText.replace(/\{\{value\}\}/g, routine._sensorValue);
                        ttsText = ttsText.replace(/\{\{threshold\}\}/g, routine._sensorThreshold ?? '');
                    }
                    speakTTS(ttsText);
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

            // --- v1.7 범용 액션 ---
            case 'terminal_command':
                // Plugin-X 범용: 터미널 명령어를 CommandRouter로 디스패치
                // config 예시: { "action": "terminal_command", "command": "/ns clean" }
                if (routine.command && window.CommandRouter) {
                    console.log(`[Scheduler] Dispatching terminal command: ${routine.command}`);
                    try {
                        await window.CommandRouter.route(routine.command, "gemini");
                    } catch (e) {
                        console.error(`[Scheduler] Command failed: ${routine.command}`, e);
                    }
                }
                break;

            case 'api_call':
                // Plugin-X 범용: 백엔드 API를 직접 호출
                // config 예시: { "action": "api_call", "url": "/api/plugins/notion/rules/evaluate", "method": "GET" }
                if (routine.url) {
                    try {
                        const options = { method: routine.method || 'GET' };
                        if (routine.body && options.method !== 'GET') {
                            options.headers = { 'Content-Type': 'application/json' };
                            options.body = JSON.stringify(routine.body);
                        }
                        const res = await fetch(routine.url, options);
                        const data = await res.json();
                        console.log(`[Scheduler] API call result:`, data);

                        // 결과를 TTS로 안내 (선택)
                        if (routine.speak_result && data.message && typeof window.speakTTS === 'function') {
                            window.speakTTS(data.message);
                        }
                    } catch (e) {
                        console.error(`[Scheduler] API call failed: ${routine.url}`, e);
                    }
                }
                break;

            default:
                // [v2.0] Dynamic Plugin Actions Handling
                if (routine.action && routine.action.startsWith('plugin:')) {
                    if (routine.plugin_payload) {
                        const payload = routine.plugin_payload;
                        console.log(`[Scheduler] Executing plugin action: ${routine.action}`, payload);

                        // 1. 템플릿 변환 (센서 값 등)
                        const processTemplate = (str) => {
                            if (typeof str !== 'string') return str;
                            let res = str;
                            if (routine._sensorValue !== undefined) {
                                res = res.replace(/\{\{value\}\}/g, routine._sensorValue);
                                res = res.replace(/\{\{threshold\}\}/g, routine._sensorThreshold ?? '');
                            }
                            return res;
                        };

                        if (payload.type === 'terminal_command' && payload.command) {
                            if (window.CommandRouter) {
                                window.CommandRouter.route(processTemplate(payload.command), "gemini");
                            }
                        } else if (payload.type === 'api_call' && payload.url) {
                            const url = processTemplate(payload.url);
                            const options = { method: payload.method || 'GET' };
                            // API의 경우 body가 있을 수 있음
                            fetch(url, options).catch(e => console.error(e));
                        }
                    } else {
                        console.warn(`[Scheduler] Plugin action ${routine.action} has no payload.`);
                    }
                } else if (window.logger) {
                    window.logger.warn(`[Scheduler] Unknown action: ${routine.action}`);
                }
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
