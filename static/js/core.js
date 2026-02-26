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
 * Fetches settings and bootstraps all modular components.
 */
async function initEngine() {
    // 1. 서버 설정 로드
    const settings = await fetch('/get_settings').then(r => r.json());

    window.userZoom = settings.zoom || 1.0;
    window.offsetX = settings.offset_x || 0;
    window.offsetY = settings.offset_y || 0;
    window.activeModelName = settings.last_model || "hiyori_vts";
    window.uiPositions = settings.ui_positions || {};
    window.panelVisibility = settings.panel_visibility || {};

    // 2. 로컬 캐시(기기별 레이아웃) 동기화
    const localDataRaw = localStorage.getItem('aegis_layout');
    if (localDataRaw) {
        try {
            const localData = JSON.parse(localDataRaw);
            // 저장된 키값(snake_case)을 현재 변수명(camelCase)으로 매핑
            if (localData.ui_positions) window.uiPositions = localData.ui_positions;
            if (localData.panel_visibility) window.panelVisibility = localData.panel_visibility;
            if (localData.zoom !== undefined) window.userZoom = localData.zoom;
            if (localData.offset_x !== undefined) window.offsetX = localData.offset_x;
            if (localData.offset_y !== undefined) window.offsetY = localData.offset_y;
            if (localData.last_model) window.activeModelName = localData.last_model;
        } catch (e) {
            console.error("[Core] Failed to parse local layout data:", e);
        }
    }

    // 3. 렌더러 초기화 (renderer.js)
    if (typeof initPixiApp === 'function') initPixiApp();

    // 4. 모델 로드 (model_controller.js)
    if (typeof refreshModelList === 'function') await refreshModelList(window.activeModelName);
    if (typeof loadModel === 'function') await loadModel(window.activeModelName);

    // 5. 기타 UI 및 위젯 초기화 (ui.js, widgets.js)
    if (typeof initUI === 'function') initUI();
    if (typeof initWidgets === 'function') initWidgets();

    if (window.logger) window.logger.info("[Core] Engine bootstrapped successfully.");
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
        // 1. 기기별 레이아웃은 로컬 스토리지에 즉시 저장
        localStorage.setItem('aegis_layout', JSON.stringify(localState));

        // 2. 서버에는 어떤 기기에서든 동일해야 하는 정보(모델명)만 백업
        const serverSync = {
            last_model: window.activeModelName
        };
        fetch('/save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serverSync)
        });
    }, 500);
}

// 윈도우 로드 시 엔진 시작
window.onload = initEngine;
