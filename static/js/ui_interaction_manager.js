/**
 * AEGIS UI - Interaction Manager
 * Handles avatar canvas dragging, zooming, and right-click motions.
 */

let lastMouseX, lastMouseY;

/**
 * 아바타 캔버스 상호작용 초기화 (줌, 이동, 우클릭 모션)
 */
function initInteractions() {
    const canvas = document.getElementById('live2d-canvas');
    if (!canvas) return;

    // 1. 포인터 다운 (이동 시작 또는 우클릭 모션)
    canvas.onpointerdown = (e) => {
        // 마우스 오른쪽 버튼: 랜덤 모션 재생
        if (e.button === 2) {
            if (typeof playRandomMotion === 'function') playRandomMotion();
            return;
        }

        // 마우스 왼쪽 버튼: 드래그 시작
        if (e.button !== 0) return;

        window.isDraggingCanvas = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    };

    // 우클릭 메뉴 차단
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // 2. 포인터 이동 (아바타 위치 이동)
    window.onpointermove = (e) => {
        if (!window.isDraggingCanvas) return;

        window.offsetX += (e.clientX - lastMouseX);
        window.offsetY += (e.clientY - lastMouseY);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        // renderer.js 등에서 관리하는 레이아웃 재조정 호출
        if (window._lastAdjust) window._lastAdjust();
        if (window.saveState) window.saveState();
    };

    // 3. 포인터 업 (이동 종료)
    window.onpointerup = () => {
        window.isDraggingCanvas = false;
    };

    // 4. 마우스 휠 (줌 인/아웃)
    window.addEventListener('wheel', (e) => {
        // 줌 로직은 배율(0.1 ~ 5.0) 제한
        window.userZoom = Math.min(Math.max(0.1, window.userZoom + (e.deltaY > 0 ? -0.1 : 0.1)), 5.0);

        if (window._lastAdjust) window._lastAdjust();
        if (window.saveState) window.saveState();
    }, { passive: false });

    if (window.logger) window.logger.info("[Interaction] Canvas interactions initialized.");
}

/**
 * 아바타의 랜덤 모션 재생
 */
function playRandomMotion() {
    if (!window.modelAssets || !window.modelAssets.motions || window.modelAssets.motions.length === 0) return;

    const randomIndex = Math.floor(Math.random() * window.modelAssets.motions.length);
    const motionFile = window.modelAssets.motions[randomIndex];

    if (typeof window.dispatchAvatarEvent === 'function') {
        window.dispatchAvatarEvent('MOTION', { file: motionFile });
    }
}
