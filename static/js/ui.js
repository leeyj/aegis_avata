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
    if (typeof initUIDragging === 'function') initUIDragging();
    if (typeof initInteractions === 'function') initInteractions();
    if (typeof initBriefingTrigger === 'function') initBriefingTrigger();

    // 3. 초기 상태(위치, 표시 여부, 잠금) 반영
    if (typeof applyUIPositions === 'function') applyUIPositions();
    applyVisibility();
    updateLockUI();

    // 4. 이벤트 리스너 등록
    window.addEventListener('resize', () => {
        if (typeof applyUIPositions === 'function') applyUIPositions();
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
 * 사이드바 및 컨트롤 패널 초기화
 */
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            sidebar.classList.toggle('active');
            toggleBtn.innerText = sidebar.classList.contains('active') ? '✕' : '•••';
        };
    }

    // 패널 토글 함수 전역 노출 (사이드바 체크박스용)
    window.togglePanel = (id, isVisible) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = isVisible ? 'block' : 'none';
            window.panelVisibility[id] = isVisible;

            // [Sync] 사이드바 체크박스 상태 동기화
            const checkbox = document.getElementById(`toggle-${id}`) || document.querySelector(`input[onchange*="'${id}'"]`);
            if (checkbox) checkbox.checked = isVisible;

            saveState();
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

    // 시각적 및 기능적 피드백 (리사이즈 금지 포함)
    document.querySelectorAll('.glass-panel').forEach(p => {
        p.classList.toggle('locked', window.uiLocked);
    });
}

function updateLockUI() {
    const btn = document.getElementById('lock-toggle-btn');
    if (!btn) return;

    if (window.uiLocked) {
        btn.setAttribute('data-i18n', 'sidebar.unlock_widgets');
        btn.innerText = _t('sidebar.unlock_widgets');
        btn.classList.add('btn-danger');
    } else {
        btn.setAttribute('data-i18n', 'sidebar.lock_widgets');
        btn.innerText = _t('sidebar.lock_widgets');
        btn.classList.remove('btn-danger');
    }

    // 전역 상태에 맞춰 실제 패널 클래스 동기화
    document.querySelectorAll('.glass-panel').forEach(p => {
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
            el.style.display = isVisible ? 'block' : 'none';

            // [Sync] 사이드바 체크박스 상태 동기화 (기존 방식 + 신규 토글 ID 방식)
            const checkbox = document.getElementById(`toggle-${id}`) || document.querySelector(`input[onchange*="'${id}'"]`);
            if (checkbox) checkbox.checked = isVisible;
        }
    }
}
