/**
 * AEGIS Animation Manager
 * Central Event Bus & State Controller for Avatar Animations.
 */

const AvatarEvents = {
    IDLE: 'IDLE',
    MUSIC_START: 'MUSIC_START',
    MUSIC_STOP: 'MUSIC_STOP',
    TTS_START: 'TTS_START',
    TTS_STOP: 'TTS_STOP',
    EMOTION: 'EMOTION',
    MOTION: 'MOTION',
    HAPPY_DANCE: 'HAPPY_DANCE'
};

class AnimationManager {
    constructor() {
        this.state = AvatarEvents.IDLE;
        this.danceMode = false;
        this.ttsActive = false;
        this.currentEmotion = null;
        this.motionQueue = [];
        this.happyDanceTimer = null;
        this.emotionResetTimer = null;

        console.log("%c[AnimationManager] Initialized.", "color: #00ffff; font-weight: bold;");
    }

    /**
     * Dispatch an event to the avatar system
     */
    dispatch(type, payload = {}) {
        if (window.logger) window.logger.info(`[AnimationManager] Event Received: ${type}, Payload: ${JSON.stringify(payload)}`);

        switch (type) {
            case AvatarEvents.MUSIC_START:
                this.danceMode = true;
                this.state = AvatarEvents.MUSIC_START;
                break;
            case AvatarEvents.MUSIC_STOP:
                this.danceMode = false;
                if (!this.ttsActive) this.state = AvatarEvents.IDLE;
                break;
            case AvatarEvents.TTS_START:
                this.ttsActive = true;
                this.state = AvatarEvents.TTS_START;
                // Optional: set talking emotion
                if (window.playExpression) window.playExpression("f01"); // Example default
                break;
            case AvatarEvents.TTS_STOP:
                this.ttsActive = false;
                if (this.danceMode) this.state = AvatarEvents.MUSIC_START;
                else this.state = AvatarEvents.IDLE;
                break;
            case AvatarEvents.EMOTION:
                if (window.playExpression) {
                    let targetFile = payload.file;
                    if (payload.alias && window.modelAssets && window.modelAssets.aliases.expressions) {
                        targetFile = window.modelAssets.aliases.expressions[payload.alias] || targetFile;
                    }
                    if (targetFile) {
                        window.playExpression(targetFile);
                        this._scheduleEmotionReset(payload.duration || 10000);
                    }
                }
                break;
            case AvatarEvents.MOTION:
                if (window.playMotionFile) {
                    let targetFile = payload.file;
                    if (payload.alias && window.modelAssets && window.modelAssets.aliases.motions) {
                        targetFile = window.modelAssets.aliases.motions[payload.alias] || targetFile;
                    }
                    if (targetFile) window.playMotionFile(targetFile);
                }
                break;
            case AvatarEvents.HAPPY_DANCE:
                this._startHappyDance(payload.duration || 5000);
                break;
            default:
                console.warn(`[AnimationManager] Unknown Event Type: ${type}`);
        }
    }

    _startHappyDance(duration) {
        if (this.happyDanceTimer) clearTimeout(this.happyDanceTimer);

        this.happyDanceMode = true;
        this.state = AvatarEvents.HAPPY_DANCE;

        // 기쁜 표정 자동 재생 (모델의 f04 또는 f02 등 일반적인 기쁨 표정 시도)
        if (window.playExpression) window.playExpression("f02");

        this.happyDanceTimer = setTimeout(() => {
            this.happyDanceMode = false;
            this.state = AvatarEvents.IDLE;
            this.happyDanceTimer = null;
            if (window.logger) window.logger.info("[AnimationManager] Happy Dance Ended.");
        }, duration);
    }

    _scheduleEmotionReset(duration) {
        if (this.emotionResetTimer) clearTimeout(this.emotionResetTimer);

        this.emotionResetTimer = setTimeout(() => {
            if (window.playExpression) {
                // 기본 표정(f01 또는 빈 값)으로 복원
                // 모델마다 다르지만 보통 빈 문자열이나 f01이 리셋 역할
                window.playExpression("");
                if (window.logger) window.logger.info("[AnimationManager] Emotion Reset to Default.");
            }
            this.emotionResetTimer = null;
        }, duration);
    }

    /**
     * Get integrated animation parameters for the current frame
     * Called by core.js ticker
     */
    getAnimationParams(delta, time) {
        const params = {
            angleZ: 0,
            bodyX: 0,
            mouthOpen: 0
        };

        // 1. Dancing Logic (Sine waves)
        if (this.danceMode) {
            // 속도 및 폭 상향 조정 (더 경쾌하게)
            params.angleZ = Math.sin(time * 3.5) * 12; // 더 빠른 머리 흔들기
            params.bodyX = Math.cos(time * 1.5) * 6;   // 더 빠른 몸 스웨이

            // 음악에 맞춰 더 빠르게 입을 벙긋거림 (리듬 상승)
            params.mouthOpen = Math.abs(Math.sin(time * 4.0)) * 0.8;
        }

        // 1-2. Happy Dance Logic (더 강렬하고 무작위적인 느낌)
        if (this.happyDanceMode) {
            // 위아래로 점프하는 느낌 (Body X를 Y처럼 활용하거나 Angle Z를 크게)
            params.angleZ += Math.sin(time * 8.0) * 15; // 매우 빠른 까닥거림
            params.bodyX += Math.cos(time * 4.0) * 10;  // 큰 스웨이

            // 기뻐서 입을 크게 벌림
            params.mouthOpen = Math.max(params.mouthOpen, 0.5 + Math.abs(Math.sin(time * 10.0)) * 0.5);
        }

        // 2. TTS Lip Sync Logic (Random or based on volume if possible)
        if (this.ttsActive) {
            // 말하는 속도에 맞춰 입 모양 시뮬레이션 속도 상향
            params.mouthOpen = Math.abs(Math.sin(time * 6.0)) * 0.9;

            // 말할 때 가볍게 머리를 까닥거림
            params.angleZ += Math.sin(time * 2.0) * 4;
        }

        return params;
    }
}

// Global Instance
window.animationManager = new AnimationManager();
window.dispatchAvatarEvent = (type, payload) => {
    if (window.animationManager) {
        window.animationManager.dispatch(type, payload);
    } else {
        console.error("[AnimationManager] Manager not initialized yet!");
    }
};
