/**
 * AEGIS UI - Drag & Resize Manager (V4 Isolated)
 */


function initUIDraggingV4() {
    document.querySelectorAll('.glass-panel-v4').forEach(panel => {
        initSinglePanelDraggingV4(panel);
    });
}

/**
 * 특정 패널에 대해 드래그 및 리사이즈 이벤트를 바인딩합니다.
 */
function initSinglePanelDraggingV4(panel) {
    if (!panel) return;

    let isResizing = false;
    let startW = 0, startH = 0;

    panel.onpointerdown = (e) => {
        const rect = panel.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        const target = e.target;
        const targetTag = (target && target.nodeName) ? target.nodeName.toUpperCase() : '';

        // 1. 리사이즈 핸들 클릭 감지 (우측 하단 30px 영역으로 확대)
        const isResizeHandle = (offsetX > panel.offsetWidth - 30) && (offsetY > panel.offsetHeight - 30);

        const handleEl = target.closest('.widget-drag-handle-v4');
        const isInteractive = targetTag === 'IFRAME' || target.classList.contains('widget-iframe');

        // [v4.0.3] Strict Lock Policy: No drag or resize if UI is locked
        if (window.uiLocked) return;

        if (!isResizeHandle && (isInteractive || !handleEl || e.ctrlKey)) {
            console.log(`[DragManager V4] Interaction allowed (Non-drag) on: ${targetTag}`);
            return;
        }

        e.stopPropagation();
        startX = e.clientX;
        startY = e.clientY;
        p3 = e.clientX;
        p4 = e.clientY;
        startW = panel.offsetWidth;
        startH = panel.offsetHeight;
        isResizing = isResizeHandle;
        hasMoved = false;

        panel.setPointerCapture(e.pointerId);

        panel.onpointerup = (ev) => {
            panel.releasePointerCapture(ev.pointerId);
            panel.onpointerup = null;
            panel.onpointermove = null;

            if (hasMoved) {
                window.uiPositions[panel.id] = {
                    leftRatio: panel.offsetLeft / window.innerWidth,
                    topRatio: panel.offsetTop / window.innerHeight,
                    width: panel.style.width,
                    height: panel.style.height
                };
                if (window.saveState) window.saveState();
            }
            isResizing = false;
        };

        panel.onpointermove = (ev) => {
            const deltaX = ev.clientX - startX;
            const deltaY = ev.clientY - startY;

            if (!hasMoved) {
                if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                    hasMoved = true;
                } else return;
            }

            if (isResizing) {
                panel.style.width = (startW + deltaX) + "px";
                panel.style.height = (startH + deltaY) + "px";
            } else {
                p1 = p3 - ev.clientX;
                p2 = p4 - ev.clientY;
                p3 = ev.clientX;
                p4 = ev.clientY;

                panel.style.top = (panel.offsetTop - p2) + "px";
                panel.style.left = (panel.offsetLeft - p1) + "px";
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
            }

            if (panel.style.position !== 'fixed' && panel.style.position !== 'absolute') {
                panel.style.position = 'absolute';
            }
        };
    };

    panel.onmouseup = () => {
        if (window.uiPositions[panel.id]) {
            window.uiPositions[panel.id].width = panel.style.width;
            window.uiPositions[panel.id].height = panel.style.height;
            if (window.saveState) window.saveState();
        }
    };
}

function applyUIPositionsV4() {
    if (!window.uiPositions) return;
    for (const [id, pos] of Object.entries(window.uiPositions)) {
        const el = document.getElementById(id);
        if (el) {
            if (el.classList.contains('fixed-plugin-wrapper') || el.classList.contains('fixed-plugin')) {
                continue;
            }

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

window.initUIDraggingV4 = initUIDraggingV4;
window.initSinglePanelDraggingV4 = initSinglePanelDraggingV4;
window.applyUIPositionsV4 = applyUIPositionsV4;

window.initUIDraggingV4 = initUIDraggingV4;
window.initSinglePanelDraggingV4 = initSinglePanelDraggingV4;
window.applyUIPositionsV4 = applyUIPositionsV4;
