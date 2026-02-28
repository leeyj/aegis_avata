/**
 * AEGIS UI - Drag & Resize Manager
 * Handles dragging and resizing of glass panels.
 */

function initUIDragging() {
    document.querySelectorAll('.glass-panel').forEach(panel => {
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;

        panel.onpointerdown = (e) => {
            // 1. 리사이즈 핸들 클릭 감지 (우측 하단 20px 영역)
            const isResizeHandle = (e.offsetX > panel.offsetWidth - 20) && (e.offsetY > panel.offsetHeight - 20);
            if (isResizeHandle) return;

            // 2. 드래그 무시 조건
            const isInteractive = e.target.closest('button, select, input, a, .finance-item, .no-drag');
            if (isInteractive || e.ctrlKey || window.uiLocked) return;

            e.stopPropagation();

            p3 = e.clientX;
            p4 = e.clientY;

            panel.setPointerCapture(e.pointerId);

            panel.onpointerup = (ev) => {
                panel.releasePointerCapture(ev.pointerId);
                panel.onpointerup = null;
                panel.onpointermove = null;

                // 위치 및 크기 데이터 업데이트
                window.uiPositions[panel.id] = {
                    leftRatio: panel.offsetLeft / window.innerWidth,
                    topRatio: panel.offsetTop / window.innerHeight,
                    width: panel.style.width,
                    height: panel.style.height
                };

                if (window.saveState) window.saveState();
            };

            panel.onpointermove = (ev) => {
                p1 = p3 - ev.clientX; p2 = p4 - ev.clientY;
                p3 = ev.clientX; p4 = ev.clientY;
                panel.style.top = (panel.offsetTop - p2) + "px";
                panel.style.left = (panel.offsetLeft - p1) + "px";
                panel.style.right = 'auto'; panel.style.bottom = 'auto';
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
    });
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
