/**
 * AEGIS Widget Manager
 * Centralizes widget orchestration and lifecycle management.
 */

window.WidgetManager = {
    registry: [],
    configs: {},

    /**
     * 위젯을 매니저에 등록합니다.
     * @param {string} name 위젯 식별자
     * @param {function} initFn 위젯 시작 함수
     */
    register: function (name, initFn) {
        this.registry.push({ name, initFn });
    },

    /**
     * 등록된 모든 위젯을 시퀀스에 맞춰 초기화합니다.
     */
    initAll: async function () {
        if (window.logger) window.logger.info("[WidgetManager] Initializing all widgets...");

        // 1. 공통 설정 로드 (TTS, Briefing 등)
        await this.loadConfigs();

        // 2. 등록된 위젯 순차 실행
        for (const widget of this.registry) {
            try {
                if (typeof widget.initFn === 'function') {
                    widget.initFn();
                }
            } catch (e) {
                console.error(`[WidgetManager] Failed to start widget "${widget.name}":`, e);
            }
        }

        if (window.logger) window.logger.info(`[WidgetManager] ${this.registry.length} widgets started.`);
    },

    /**
     * 위젯 구동에 필요한 공통 서버 설정 로드 (병렬 최적화)
     */
    loadConfigs: async function () {
        try {
            await Promise.all([
                // 1. TTS 설정 로드
                (async () => {
                    const ttsRes = await fetch('/api/plugins/proactive-agent/config/tts');
                    const ttsData = await ttsRes.json();
                    if (typeof window.globalTtsConfig !== 'undefined') {
                        Object.assign(window.globalTtsConfig, ttsData);
                    }
                })(),
                // 2. Briefing 설정 로드
                (async () => {
                    if (typeof window.applyBriefingConfig === 'function') {
                        await window.applyBriefingConfig();
                    }
                })()
            ]);
        } catch (e) {
            console.error("[WidgetManager] Config loading failed:", e);
        }
    }
};

/**
 * 전역 위젯 부트스트래퍼 (기존 인덱스 호환용)
 */
async function initWidgets() {
    // 위젯 매니저 초기화 및 공통 서비스 기동
    const wm = window.WidgetManager;
    wm.registry = [];

    // 외부 AI 연동 시작 (매니저 독립 구동)
    if (typeof initExternalAPI === 'function') initExternalAPI();

    // 등록된 위젯(Terminal 등)들과 공통 설정 기동
    await wm.initAll();
}
