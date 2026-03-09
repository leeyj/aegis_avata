/**
 * AEGIS UI - Interaction Manager
 * Handles avatar canvas dragging, zooming, and right-click motions.
 */

let lastMouseX, lastMouseY;
let clickCount = 0;
let clickTimer = null;
let longPressTimer = null;
let isLongPress = false;

/**
 * 아바타 캔버스 상호작용 초기화 (v3.0.3 통합 버전)
 */
function initInteractions() {

    const canvas = document.getElementById('live2d-canvas');
    if (!canvas) return;

    // 1. 포인터 다운 (이동 시작, 우클릭, 롱클릭 탐지)
    canvas.onpointerdown = (e) => {
        if (window.uiLocked) return;

        // 마우스 오른쪽 버튼: 랜덤 모션 재생 (기존 유지)
        if (e.button === 2) {
            if (typeof playRandomMotion === 'function') playRandomMotion();
            return;
        }

        if (e.button !== 0) return;

        // [v3.0.3] 롱클릭 타이머 시작 (800ms)
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            resetAvatarLayout(); // 롱클릭 시 레이아웃 리셋
        }, 800);

        window.isDraggingCanvas = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    };

    // 2. 포인터 업 (클릭 횟수 계산 및 트리거)
    window.onpointerup = (e) => {
        clearTimeout(longPressTimer);
        window.isDraggingCanvas = false;

        if (isLongPress) return; // 롱클릭 시 일반 클릭 무시

        // 클릭 횟수 누적 및 타이머 설정
        clickCount++;
        clearTimeout(clickTimer);

        clickTimer = setTimeout(() => {
            if (clickCount === 2) {
                // [Case 1] 더블 클릭: 터미널 토글 (플러그인 API 호출)
                if (window.TerminalUI && window.TerminalUI.toggle) {
                    window.TerminalUI.toggle();
                }
            } else if (clickCount >= 3) {
                // [Case 2] 트리플 클릭: 아무말 대잔치 (기존 플러그인 이벤트 발생)
                if (typeof window.dispatchAvatarEvent === 'function') {
                    // 플러그인에서 감지할 수 있도록 커스텀 이벤트나 직접 호출 유도
                    console.log("[Interaction] Triple click detected - triggering nonsense.");
                    // NOTE: 마르코프 플러그인은 자체적으로 mousedown을 감시하지만, 
                    // 여기서 명시적으로 기능을 트리거할 수도 있습니다.
                }
            }
            clickCount = 0;
        }, 300); // 300ms 이내의 클릭을 하나로 묶음
    };

    // 우클릭 메뉴 차단
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // 3. 포인터 이동 (아바타 위치 이동 및 마우스 추적)
    window.addEventListener('pointermove', (e) => {
        // [v3.0.2] 마우스 추적 (Look-at) 기능 적용
        if (window.enableLookAtCursor && window.currentAvatar) {
            // [v3.4.6] 댐핑 효과는 pixi-live2d-display 내부 InteractionManager가 처리하도록 유도
            // autoInteract가 false일 경우를 대비해 직접 추적 좌표 주입
            window.currentAvatar.focus(e.clientX, e.clientY);
        }

        if (!window.isDraggingCanvas) return;

        // 드래그가 시작되면 롱클릭 타이머 취소 (이동하려는 것이므로)
        if (typeof lastMouseX !== 'undefined' && (Math.abs(e.clientX - lastMouseX) > 5 || Math.abs(e.clientY - lastMouseY) > 5)) {
            clearTimeout(longPressTimer);
        }

        if (typeof lastMouseX !== 'undefined') {
            window.offsetX += (e.clientX - lastMouseX);
            window.offsetY += (e.clientY - lastMouseY);
        }

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        if (window._lastAdjust) window._lastAdjust();
        if (window.saveState) window.saveState();
    });

    // 4. 마우스 휠 (줌 인/아웃)
    window.addEventListener('wheel', (e) => {
        if (window.uiLocked) return;

        const path = e.composedPath();
        const shouldSkip = path.some(el =>
            el.classList && (
                el.classList.contains('sidebar-container') ||
                el.classList.contains('glass-panel') ||
                el.classList.contains('terminal-container') ||
                el.classList.contains('fixed-plugin')
            )
        );

        if (shouldSkip) return;

        window.userZoom = Math.min(Math.max(0.1, window.userZoom + (e.deltaY > 0 ? -0.1 : 0.1)), 5.0);

        if (window._lastAdjust) window._lastAdjust();
        if (window.saveState) window.saveState();
    }, { passive: false });

    if (window.logger) window.logger.info("[Interaction] Advanced interactions initialized.");
}

/**
 * 아바타 레이아웃 초기화 (v3.0.3)
 * 위치와 크기를 중앙 표준 상태로 복구합니다.
 */
function resetAvatarLayout() {
    if (window.logger) window.logger.info("[Interaction] Resetting avatar layout...");

    // 시각적 피드백을 위해 간단한 텍스트 출력
    if (typeof window.speakAndBubble === 'function') {
        window.speakAndBubble("레이아웃을 초기화할게요.", { duration: 2000 });
    }

    // 값 초기화
    window.userZoom = 1.0;
    window.offsetX = 0;
    window.offsetY = 0;

    if (window._lastAdjust) window._lastAdjust();
    if (window.saveState) window.saveState();
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
