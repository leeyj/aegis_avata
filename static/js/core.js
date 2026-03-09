/**
 * AEGIS Core - Management & Bootstrapper
 * Orchestrates all modules and handles persistent state.
 */

window.app = null;
window.currentAvatar = null;
window.activeModelName = "";
window.userZoom = 1.0;
window.offsetX = 0;
window.offsetY = 0;
window.uiPositions = {};
window.panelVisibility = {};
window.uiLocked = false;
window.enableLookAtCursor = true; // [v3.4.6] 마우스 추적(Look-at) 활성 플래그

// [v3.4.6] 전역 오디오 잠금 해제 함수
window.unlockAudio = async function () {
    if (window.AudioContext || window.webkitAudioContext) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!window._audioCtx) window._audioCtx = new AudioContext();
            if (window._audioCtx.state === 'suspended') {
                await window._audioCtx.resume();
                console.log("[Core] AudioContext unlocked.");
            }
            // 무음 버퍼 재생으로 확실하게 해제
            const buffer = window._audioCtx.createBuffer(1, 1, 22050);
            const source = window._audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(window._audioCtx.destination);
            source.start(0);
        } catch (e) {
            console.warn("[Core] Audio unlock failed:", e);
        }
    }
};

// 사용자가 화면의 아무 곳이나 처음 클릭할 때 오디오 잠금 해제 트리거
document.addEventListener('click', () => window.unlockAudio(), { once: true });
document.addEventListener('touchstart', () => window.unlockAudio(), { once: true });
document.addEventListener('keydown', () => window.unlockAudio(), { once: true });

// [v2.0] Global Command Router has been migrated to static/js/widgets/ai_gateway.js

let saveTimeout;

/**
 * [1] Initialize Dashboard Engine
 * Boosted Bootstrapper - Optimized for parallel execution.
 */
async function initEngine() {
    if (window.logger) window.logger.info(`[Core] Bootstrapping engine...`);

    try {
        // 1. 병렬 초기화 시작 (네트워크 대기 시간 최소화)
        const [settings, _, __] = await Promise.all([
            fetch('/get_settings').then(r => r.json()),
            window.briefingScheduler ? window.briefingScheduler.init() : Promise.resolve(),
            typeof I18nManager !== 'undefined' ? I18nManager.init() : Promise.resolve()
        ]);

        // 2. 기본 상태 반영
        window.userZoom = settings.zoom || 1.0;
        window.offsetX = settings.offset_x || 0;
        window.offsetY = settings.offset_y || 0;
        window.activeModelName = settings.last_model || "hiyori_vts";
        window.uiPositions = settings.ui_positions || {};
        window.panelVisibility = settings.panel_visibility || {};
        window.uiLocked = settings.ui_locked || false;

        // 3. 로컬 캐시 동기화
        const localDataRaw = localStorage.getItem('aegis_layout');
        if (localDataRaw) {
            try {
                const localData = JSON.parse(localDataRaw);
                if (localData.ui_positions) window.uiPositions = localData.ui_positions;
                if (localData.panel_visibility) window.panelVisibility = localData.panel_visibility;
                if (localData.zoom !== undefined) window.userZoom = localData.zoom;
                if (localData.offset_x !== undefined) window.offsetX = localData.offset_x;
                if (localData.offset_y !== undefined) window.offsetY = localData.offset_y;
                if (localData.last_model) window.activeModelName = localData.last_model;
                if (localData.ui_locked !== undefined) window.uiLocked = localData.ui_locked;
            } catch (e) { }
        }

        // 4. 독립적 모듈 동시 기동 (중요)
        // 렌더러와 위젯을 기다리지 않고 바로 시작합니다.
        if (typeof initPixiApp === 'function') initPixiApp();
        if (typeof initUI === 'function') initUI();

        // 위젯은 즉무(즉시 무조건) 실행하여 데이터 먼저 확보
        if (typeof initWidgets === 'function') initWidgets();

        // [v3.0] Command Router 초기화 (알리아스 동기화)
        if (window.CommandRouter) window.CommandRouter.init();

        // [Plugin-X] 플러그인 동적 로딩 시작
        if (window.PluginLoader) window.PluginLoader.init();

        // 5. 아바타 로딩 (무거운 작업이므로 백그라운드 병렬 처리)
        (async () => {
            if (typeof refreshModelList === 'function') await refreshModelList(window.activeModelName);
            if (typeof loadModel === 'function') await loadModel(window.activeModelName);
        })();

        if (window.logger) window.logger.info("[Core] Critical path loaded. UI and Widgets ready.");
    } catch (e) {
        console.error("[Core] Fast boot failed, falling back to sequential:", e);
    }
}

/**
 * [2] Persistence - Sync state to server
 */
window.saveSettings = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const localState = {
            zoom: window.userZoom,
            offset_x: window.offsetX,
            offset_y: window.offsetY,
            ui_positions: window.uiPositions,
            panel_visibility: window.panelVisibility,
            last_model: window.activeModelName,
            ui_locked: window.uiLocked,
            lang: window.currentLang // [추가] 현재 선택된 언어 저장
        };
        localStorage.setItem('aegis_layout', JSON.stringify(localState));

        const serverSync = {
            last_model: window.activeModelName,
            lang: window.currentLang,
            ui_positions: window.uiPositions,
            panel_visibility: window.panelVisibility,
            ui_locked: window.uiLocked,
            zoom: window.userZoom,
            offset_x: window.offsetX,
            offset_y: window.offsetY
        };
        fetch('/save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverSync)
        });
    }, 500);
}

// 윈도우 로드가 아닌 DOM이 준비되자마자 즉시 시작
document.addEventListener('DOMContentLoaded', initEngine);

/**
 * [v2.2.1] Native Desktop Integration
 * Called by desktop/desktop.py when toggling accessory mode.
 */
window.onDesktopModeChanged = (mode) => {
    if (mode === 'accessory') {
        document.body.classList.add('desktop-accessory');
        document.body.classList.add('desktop-mode');
        if (window.logger) window.logger.info("[DNA] Accessory mode activated.");
    } else {
        document.body.classList.remove('desktop-accessory');
        document.body.classList.remove('desktop-mode');
        if (window.logger) window.logger.info("[DNA] Standard mode restored.");
    }
};

/**
 * [v2.4.0] Native System Statistics Bridge
 * Receives CPU/RAM data from C# desktop application.
 */
window.onNativeStatsReceived = (stats) => {
    // 1. 글로벌 상태 저장
    window.nativeStats = stats;

    // 2. 로그 (테스트용)
    if (window.logger && stats.cpu > 80) {
        window.logger.warn(`[Native] High CPU Load Detected: ${stats.cpu}%`);
    }

    // 3. 커스텀 이벤트 발생 (위젯들이 구독 가능)
    const event = new CustomEvent('aegis:native-stats', { detail: stats });
    window.dispatchEvent(event);
};
