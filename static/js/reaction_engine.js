/**
 * AEGIS Reaction Engine
 * 하드코딩된 반응 로직을 설정 기반으로 처리합니다.
 */
class ReactionEngine {
    constructor() {
        this.reactions = null;
        this.isLoaded = false;
        this.cooldowns = {};
    }

    async init() {
        try {
            const res = await fetch('/config/reactions');
            if (!res.ok) throw new Error("Config not found");
            this.reactions = await res.json();
            this.isLoaded = true;
        } catch (e) {
            // console.error("[ReactionEngine] Load failed:", e);
        }
    }

    /**
     * 위젯 데이터 변화에 따른 반응 체크 및 실행
     * @param {string} widgetName 위젯 식별자 (config의 key와 일치해야 함)
     * @param {object} data 위젯에서 제공하는 데이터 (조건문에 사용됨)
     * @param {number} cooldownMs 쿨다운 시간 (기본 30초)
     */
    checkAndTrigger(widgetName, data, cooldownMs = 30000) {
        if (!this.isLoaded || !this.reactions || !this.reactions[widgetName]) return;

        const now = Date.now();
        const lastExecuted = this.cooldowns[widgetName] || 0;
        if (now - lastExecuted < cooldownMs) return;

        const widgetReactions = this.reactions[widgetName];

        for (const [key, reaction] of Object.entries(widgetReactions)) {
            if (this.evaluateCondition(reaction.condition, data)) {
                this.executeActions(reaction.actions, data);
                this.cooldowns[widgetName] = now;
                break; // 우선순위 상단 반응 하나만 실행
            }
        }
    }

    evaluateCondition(condition, data) {
        try {
            // data의 모든 키를 변수로 사용하여 조건문 평가
            const keys = Object.keys(data);
            const values = Object.values(data);
            const evaluator = new Function(...keys, `return ${condition};`);
            return evaluator(...values);
        } catch (e) {
            // console.error(`[ReactionEngine] Condition error in ${condition}:`, e);
            return false;
        }
    }

    executeActions(actions, data) {
        actions.forEach(action => {
            switch (action.type) {
                case 'MOTION':
                case 'EMOTION':
                    if (window.dispatchAvatarEvent) {
                        window.dispatchAvatarEvent(action.type, { file: action.file });
                    }
                    break;
                case 'SENTIMENT':
                    if (window.applyAvatarSentiment) {
                        window.applyAvatarSentiment(this.formatTemplate(action.value, data));
                    }
                    break;
                case 'EVENT':
                    if (window.dispatchAvatarEvent) {
                        window.dispatchAvatarEvent(action.value, data);
                    }
                    break;
                case 'TTS':
                    if (window.speakTTS) {
                        const message = this.formatTemplate(action.template, data);
                        const audioUrl = action.audioUrl ? this.formatTemplate(action.audioUrl, data) : null;
                        const visualType = action.visualType ? this.formatTemplate(action.visualType, data) : null;
                        window.speakTTS(message, audioUrl, visualType);
                    }
                    break;
            }
        });
    }

    formatTemplate(template, data) {
        let result = template;
        // 데이터 필드 치환
        for (const [key, value] of Object.entries(data)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        // 특수 가공 변수 지원
        if (data.change_pct !== undefined) {
            result = result.replace(/\{change_pct_abs\}/g, Math.abs(data.change_pct));
        }
        return result;
    }
}

// 인스턴스 생성 및 초기화
window.reactionEngine = new ReactionEngine();
window.reactionEngine.init();
