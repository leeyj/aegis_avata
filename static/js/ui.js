/**
 * AEGIS UI - Core Layout & Sidebar
 * Orchestrates UI modules and handles visibility/state.
 */

window.isDraggingCanvas = false;

// UI 상태 가드 (core.js 로드 전후 안전성 확보)
if (typeof window.uiPositions === 'undefined') window.uiPositions = {};
if (typeof window.panelVisibility === 'undefined') window.panelVisibility = {};
if (typeof window.uiLocked === 'undefined') window.uiLocked = false;

/**
 * UI 전체 초기화 시퀀스
 */
function initUI() {

    // 1. 기본 레이아웃 컴포넌트 초기화
    initSidebar();

    // 2. 모듈화된 매니저 호출
    if (typeof initUIDraggingV4 === 'function') initUIDraggingV4();
    if (typeof initInteractions === 'function') initInteractions();
    if (typeof initBriefingTrigger === 'function') initBriefingTrigger();

    // 3. 초기 상태(위치, 표시 여부, 잠금) 반영
    if (typeof applyUIPositionsV4 === 'function') applyUIPositionsV4();
    applyVisibility();
    updateLockUI();

    // 4. 이벤트 리스너 등록
    window.addEventListener('resize', () => {
        if (typeof applyUIPositionsV4 === 'function') applyUIPositionsV4();
    });

    // [v4.0] Global Shortcut for Terminal HUD (Shift + ~)
    window.addEventListener('keydown', (e) => {
        if (e.shiftKey && (e.key === '~' || e.key === '`' || e.code === 'Backquote')) {
            const isInputActive = (document.activeElement.tagName === 'INPUT' ||
                                 document.activeElement.tagName === 'TEXTAREA' ||
                                 document.activeElement.isContentEditable);
            if (!isInputActive) {
                e.preventDefault();
                if (window.messageBroker) {
                    window.messageBroker.send('terminal', 'TOGGLE_TERMINAL', {});
                }
            }
        }

        // [v4.1] Global ESC Hook (Close Terminal/Widgets)
        if (e.key === 'Escape') {
            const isTerminalOpen = window.panelVisibility && window.panelVisibility['terminal'] === true;
            if (isTerminalOpen) {
                if (window.messageBroker) {
                    window.messageBroker.send('terminal', 'TOGGLE_TERMINAL', { force: false });
                }
            }
        }
    });

    if (window.logger) window.logger.info("[UI] Core UI initialized.");
}

/**
 * 전역 상태 저장 (core.js의 중앙화된 saveSettings 활용)
 */
function saveState() {
    if (window.saveSettings) {
        window.saveSettings();
    }
}

/**
 * 서버에 설정값 백업 (하위 호환성을 위해 유지하되 saveSettings 호출)
 */
async function persistToServer() {
    saveState();
    return true;
}

/**
 * 사이드바 및 컨트롤 패널 초기화 (v2.4 - UI Core Cleanup)
 */
function initSidebar() {
    const mainToggleBtn = document.getElementById('sidebar-toggle');
    if (mainToggleBtn) {
        mainToggleBtn.onclick = () => {
            const panel = document.getElementById('sidebar');
            const isCurrentlyVisible = panel && panel.style.display !== 'none';
            window.togglePanel('sidebar', !isCurrentlyVisible);
            
            // [v4.2.9] Only persist overall UI state when the main menu is toggled
            saveState();
        };
    }

    // [v2.4] 사이드바 구현은 /plugins/sidebar 플러그인에서 담당합니다.
    window.togglePanel = (id, isVisible) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = isVisible ? '' : 'none';
            window.panelVisibility[id] = isVisible;

            const checkbox = document.getElementById(`toggle-${id}`);
            if (checkbox) checkbox.checked = isVisible;

            // 사이드바 토글 버튼 텍스트 업데이트
            if (id === 'sidebar' && mainToggleBtn) {
                mainToggleBtn.innerText = isVisible ? '✕' : '•••';
            }
        }
    };
}

/**
 * 위젯 드래그/리사이즈 잠금 토글
 */
function toggleWidgetLock() {
    window.uiLocked = !window.uiLocked;
    updateLockUI();
    saveState();
}

function updateLockUI() {
    // 1. 코어(Main Document)에 있는 패널부터 클래스 동기화
    document.querySelectorAll('.glass-panel, .glass-panel-v4, .widget-panel').forEach(p => {
        p.classList.toggle('locked', window.uiLocked);
    });

    // 1. 코어(Main Document)에 있는 패널부터 클래스 동기화
    document.querySelectorAll('.glass-panel, .glass-panel-v4, .widget-panel').forEach(p => {
        p.classList.toggle('locked', window.uiLocked);
    });
}

/**
 * 패널 표시/숨김 상태 일괄 적용
 */
function applyVisibility() {
    for (const [id, isVisible] of Object.entries(window.panelVisibility)) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = isVisible ? '' : 'none';

            // [Sync] 사이드바 체크박스 상태 동기화 (기존 방식 + 신규 토글 ID 방식)
            const checkbox = document.getElementById(`toggle-${id}`) || document.querySelector(`input[onchange*="'${id}'"]`);
            if (checkbox) checkbox.checked = isVisible;
        }
    }
}
