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
        const localData = JSON.parse(localDataRaw);
        if (localData.uiPositions) window.uiPositions = localData.uiPositions;
        if (localData.panelVisibility) window.panelVisibility = localData.panelVisibility;
        if (localData.userZoom !== undefined) window.userZoom = localData.userZoom;
        if (localData.offsetX !== undefined) window.offsetX = localData.offsetX;
        if (localData.offsetY !== undefined) window.offsetY = localData.offsetY;
        if (localData.last_model) window.activeModelName = localData.last_model;
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
        const state = {
            zoom: window.userZoom,
            offset_x: window.offsetX,
            offset_y: window.offsetY,
            last_model: window.activeModelName,
            ui_positions: window.uiPositions,
            panel_visibility: window.panelVisibility
        };
        // 로컬 스토리지에 기기별 설정 저장 (브라우저별 유지용)
        localStorage.setItem('aegis_layout', JSON.stringify(state));

        fetch('/save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
    }, 500);
}

// 윈도우 로드 시 엔진 시작
window.onload = initEngine;
