/**
 * AEGIS UI - Drag & Resize Manager
 * Handles dragging and resizing of glass panels.
 */

function initUIDragging() {
    document.querySelectorAll('.glass-panel').forEach(panel => {
        initSinglePanelDragging(panel);
    });
}

/**
 * 특정 패널에 대해 드래그 및 리사이즈 이벤트를 바인딩합니다. (Plugin-X 호환)
 */
function initSinglePanelDragging(panel) {
    if (!panel) return;

    let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
    let startX = 0, startY = 0;
    let hasMoved = false;

    panel.onpointerdown = (e) => {
        // 1. 리사이즈 핸들 클릭 감지 (우측 하단 20px 영역)
        const isResizeHandle = (e.offsetX > panel.offsetWidth - 20) && (e.offsetY > panel.offsetHeight - 20);
        if (isResizeHandle) return;

        // 2. 드래그 무시 조건 (Shadow DOM 대응: composedPath() 사용)
        const path = e.composedPath();
        const isInteractive = path.some(el =>
            el instanceof HTMLElement &&
            el.closest('button, select, input, a, .finance-item, .no-drag, .notion-item, .resize-handle, .brief-speaker')
        );

        if (isInteractive || e.ctrlKey || window.uiLocked) return;

        e.stopPropagation();

        startX = e.clientX;
        startY = e.clientY;
        p3 = e.clientX;
        p4 = e.clientY;
        hasMoved = false;

        panel.setPointerCapture(e.pointerId);

        panel.onpointerup = (ev) => {
            panel.releasePointerCapture(ev.pointerId);
            panel.onpointerup = null;
            panel.onpointermove = null;

            // 드래그가 실제로 발생했을 때만 위치 저장
            if (hasMoved) {
                window.uiPositions[panel.id] = {
                    leftRatio: panel.offsetLeft / window.innerWidth,
                    topRatio: panel.offsetTop / window.innerHeight,
                    width: panel.style.width,
                    height: panel.style.height
                };
                if (window.saveState) window.saveState();
            }
        };

        panel.onpointermove = (ev) => {
            const dragThreshold = 5;
            const deltaX = ev.clientX - startX;
            const deltaY = ev.clientY - startY;

            if (!hasMoved) {
                if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > dragThreshold) {
                    hasMoved = true;
                } else {
                    return; // 임계값 미만이면 이동 시키지 않음
                }
            }

            p1 = p3 - ev.clientX; p2 = p4 - ev.clientY;
            p3 = ev.clientX; p4 = ev.clientY;
            panel.style.top = (panel.offsetTop - p2) + "px";
            panel.style.left = (panel.offsetLeft - p1) + "px";
            panel.style.right = 'auto'; panel.style.bottom = 'auto';
            panel.style.position = 'absolute'; // 드래그 시점에 절대 좌표로 고정
        };
    };

    // 리사이즈 종료 시 크기 저장
    panel.onmouseup = () => {
        if (window.uiPositions[panel.id]) {
            window.uiPositions[panel.id].width = panel.style.width;
            window.uiPositions[panel.id].height = panel.style.height;
            if (window.saveState) window.saveState();
        }
    };
}

function applyUIPositions() {
    if (!window.uiPositions) return;
    for (const [id, pos] of Object.entries(window.uiPositions)) {
        const el = document.getElementById(id);
        if (el) {
            if (pos.leftRatio !== undefined && pos.topRatio !== undefined) {
                el.style.left = (pos.leftRatio * window.innerWidth) + "px";
                el.style.top = (pos.topRatio * window.innerHeight) + "px";
            } else if (pos.left && pos.top) {
                el.style.left = pos.left;
                el.style.top = pos.top;
            }

            if (pos.width) el.style.width = pos.width;
            if (pos.height) el.style.height = pos.height;

            el.style.right = 'auto'; el.style.bottom = 'auto';
        }
    }
}

// [Export] AEGIS UI Global Helpers
window.initUIDragging = initUIDragging;
window.initSinglePanelDragging = initSinglePanelDragging;
window.applyUIPositions = applyUIPositions;
