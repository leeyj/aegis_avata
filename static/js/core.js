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

let saveTimeout;

/**
 * [1] Initialize Dashboard Engine
 * Boosted Bootstrapper - Optimized for parallel execution.
 */
async function initEngine() {
    if (window.logger) window.logger.info("[Core] Bootstrapping engine...");

    try {
        // 1. 병렬 초기화 시작 (네트워크 대기 시간 최소화)
        const [settings, _] = await Promise.all([
            fetch('/get_settings').then(r => r.json()),
            window.briefingScheduler ? window.briefingScheduler.init() : Promise.resolve()
        ]);

        // 2. 기본 상태 반영
        window.userZoom = settings.zoom || 1.0;
        window.offsetX = settings.offset_x || 0;
        window.offsetY = settings.offset_y || 0;
        window.activeModelName = settings.last_model || "hiyori_vts";
        window.uiPositions = settings.ui_positions || {};
        window.panelVisibility = settings.panel_visibility || {};

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
            } catch (e) { }
        }

        // 4. 독립적 모듈 동시 기동 (중요)
        // 렌더러와 위젯을 기다리지 않고 바로 시작합니다.
        if (typeof initPixiApp === 'function') initPixiApp();
        if (typeof initUI === 'function') initUI();

        // 위젯은 즉무(즉시 무조건) 실행하여 데이터 먼저 확보
        if (typeof initWidgets === 'function') initWidgets();

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
            last_model: window.activeModelName
        };
        localStorage.setItem('aegis_layout', JSON.stringify(localState));

        const serverSync = { last_model: window.activeModelName };
        fetch('/save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverSync)
        });
    }, 500);
}

// 윈도우 로드가 아닌 DOM이 준비되자마자 즉시 시작
document.addEventListener('DOMContentLoaded', initEngine);
