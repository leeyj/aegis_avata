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
     * 위젯 구동에 필요한 공통 서버 설정 로드
     */
    loadConfigs: async function () {
        try {
            // TTS 설정
            const ttsRes = await fetch('/tts_config');
            const ttsData = await ttsRes.json();
            if (typeof window.globalTtsConfig !== 'undefined') {
                Object.assign(window.globalTtsConfig, ttsData);
            }

            // Briefing 설정
            if (typeof window.applyBriefingConfig === 'function') {
                await window.applyBriefingConfig();
            }
        } catch (e) {
            console.error("[WidgetManager] Config loading failed:", e);
        }
    }
};

/**
 * 전역 위젯 부트스트래퍼 (기존 인덱스 호환용)
 */
async function initWidgets() {
    // 위젯 등록 (미래에는 각 위젯 파일 하단에서 호출하도록 분리 가능)
    const wm = window.WidgetManager;
    wm.registry = []; // 초기화

    if (typeof startClock === 'function') wm.register('Clock', startClock);
    if (typeof startWeather === 'function') wm.register('Weather', startWeather);
    if (typeof initSystemUI === 'function') wm.register('SystemUI', initSystemUI);
    if (typeof startFinance === 'function') wm.register('Finance', startFinance);
    if (typeof startNews === 'function') wm.register('News', startNews);
    if (typeof startCalendar === 'function') wm.register('Calendar', startCalendar);
    if (typeof startTodo === 'function') wm.register('Todo', startTodo);
    if (typeof startGmail === 'function') wm.register('Gmail', startGmail);
    if (typeof initStockWidget === 'function') wm.register('Stock', initStockWidget);
    if (typeof startProactiveAgent === 'function') wm.register('ProactiveAgent', startProactiveAgent);
    if (typeof startYouTubeMusic === 'function') wm.register('YouTubeMusic', startYouTubeMusic);
    if (typeof startWallpaper === 'function') wm.register('Wallpaper', startWallpaper);

    // 외부 AI 연동 시작 (매니저 독립 구동)
    if (typeof initExternalAPI === 'function') initExternalAPI();

    await wm.initAll();
}
