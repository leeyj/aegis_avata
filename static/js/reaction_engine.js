/**
 * AEGIS Reaction Engine - Evaluator & Commander
 * Separates logic analysis from action execution.
 */

/**
 * [1] Reaction Evaluator
 * Handles condition checking and template formatting.
 */
class ReactionEvaluator {
    /**
     * JS 문자열 조건문을 실시간 데이터로 평가합니다.
     */
    evaluate(condition, data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const evaluator = new Function(...keys, `return ${condition};`);
            return evaluator(...values);
        } catch (e) {
            return false;
        }
    }

    /**
     * {key} 형태의 템플릿 문열을 데이터 수치로 변환합니다.
     */
    format(template, data) {
        if (!template) return "";
        let result = template;
        for (const [key, value] of Object.entries(data)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        // 특수 변수 가공 (절대값 등)
        if (data.change_pct !== undefined) {
            result = result.replace(/\{change_pct_abs\}/g, Math.abs(data.change_pct));
        }
        return result;
    }
}

/**
 * [2] Avatar Commander
 * Handles the actual execution of avatar actions (Motion, TTS, Sentiment).
 */
class AvatarCommander {
    execute(actions, data, evaluator) {
        actions.forEach(action => {
            switch (action.type) {
                case 'MOTION':
                case 'EMOTION':
                    this.dispatch(action.type, {
                        file: action.file,
                        alias: action.alias
                    });
                    break;
                case 'SENTIMENT':
                    if (window.applyAvatarSentiment) {
                        window.applyAvatarSentiment(evaluator.format(action.value, data));
                    }
                    break;
                case 'EVENT':
                    const payload = { ...data, ...action };
                    this.dispatch(action.value, payload);
                    break;
                case 'TTS':
                    if (window.speakTTS) {
                        const message = evaluator.format(action.template, data);
                        const audioUrl = action.audioUrl ? evaluator.format(action.audioUrl, data) : null;
                        const visualType = action.visualType ? evaluator.format(action.visualType, data) : null;
                        window.speakTTS(message, audioUrl, visualType);
                    }
                    break;
            }
        });
    }

    dispatch(type, payload) {
        if (window.dispatchAvatarEvent) {
            window.dispatchAvatarEvent(type, payload);
        }
    }
}

/**
 * [3] Main Reaction Engine
 * Orchestrates Evaluator and Commander using the config.
 */
class ReactionEngine {
    constructor() {
        this.reactions = null;
        this.isLoaded = false;
        this.cooldowns = {};
        this.evaluator = new ReactionEvaluator();
        this.commander = new AvatarCommander();
    }

    async init() {
        try {
            const res = await fetch('/config/reactions');
            if (!res.ok) throw new Error("Config not found");
            this.reactions = await res.json();
            this.isLoaded = true;
        } catch (e) { }
    }

    /**
     * 위젯 데이터 변화에 따른 반응 체크 및 실행
     * @param {string} widgetName 위젯 식별자
     * @param {object} data 위젯 데이터
     * @param {number} cooldownMs 쿨다운 시간
     * @param {string} subKey 개별 식별자 (예: 종목명)
     */
    checkAndTrigger(widgetName, data, cooldownMs = 30000, subKey = null) {
        if (!this.isLoaded || !this.reactions || !this.reactions[widgetName]) return;

        const now = Date.now();
        const cooldownKey = subKey ? `${widgetName}:${subKey}` : widgetName;
        const lastExecuted = this.cooldowns[cooldownKey] || 0;

        if (now - lastExecuted < cooldownMs) return;

        const widgetReactions = this.reactions[widgetName];

        for (const [key, reaction] of Object.entries(widgetReactions)) {
            if (this.evaluator.evaluate(reaction.condition, data)) {
                this.commander.execute(reaction.actions, data, this.evaluator);
                this.cooldowns[cooldownKey] = now;
                break; // 우선순위가 높은 첫 번째 조건만 실행
            }
        }
    }
}

// 전역 인스턴스 생성 및 초기화
window.reactionEngine = new ReactionEngine();
window.reactionEngine.init();
