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
    MOTION: 'MOTION'
};

class AnimationManager {
    constructor() {
        this.state = AvatarEvents.IDLE;
        this.danceMode = false;
        this.ttsActive = false;
        this.currentEmotion = null;
        this.motionQueue = [];

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
                if (window.playExpression) window.playExpression(payload.file);
                break;
            case AvatarEvents.MOTION:
                if (window.playMotionFile) window.playMotionFile(payload.file);
                break;
            default:
                console.warn(`[AnimationManager] Unknown Event Type: ${type}`);
        }
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
