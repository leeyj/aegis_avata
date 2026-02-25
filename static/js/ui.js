/**
 * AEGIS UI - Interactions & Dashboard Control
 */

let isDraggingCanvas = false;
let lastMouseX, lastMouseY;

function initUI() {
    initSidebar();
    initUIDragging();
    initInteractions();
    initBriefingTrigger();

    // 1. 서버 기본값 로드 후 LocalStorage로 덮어쓰기
    applyUIPositions();
    applyVisibility();

    // 창 크기 변경 시 위젯 위치 재조정
    window.addEventListener('resize', applyUIPositions);
}

// 상태 저장 함수 (브라우저 로컬 저장 전용)
function saveState() {
    const state = {
        uiPositions,
        panelVisibility,
        userZoom,
        offsetX,
        offsetY,
        last_model: activeModelName
    };

    // 브라우저 로컬 저장 (서버 통신 없이 즉시 반영)
    localStorage.setItem('aegis_layout', JSON.stringify(state));
}

// 서버에 현재 상태 백업 (수동 또는 특정 이벤트 시에만 호출)
async function persistToServer() {
    const state = JSON.parse(localStorage.getItem('aegis_layout') || '{}');
    if (Object.keys(state).length === 0) return;

    try {
        const res = await fetch('/save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
        if (res.ok) {
            // console.log("[UI] Layout synced to server.");
            return true;
        }
    } catch (e) {
        // console.error("[UI] Server sync failed:", e);
    }
    return false;
}

// [1] Sidebar & Visibility
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
        toggleBtn.onclick = () => {
            sidebar.classList.toggle('active');
            toggleBtn.innerText = sidebar.classList.contains('active') ? '✕' : '•••';
        };
    }

    window.togglePanel = (id, isVisible) => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = isVisible ? 'block' : 'none';
            panelVisibility[id] = isVisible;
            saveState();
        }
    };
}

function applyVisibility() {
    for (const [id, isVisible] of Object.entries(panelVisibility)) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = isVisible ? 'block' : 'none';
            const checkbox = document.querySelector(`input[onchange*="'${id}'"]`);
            if (checkbox) checkbox.checked = isVisible;
        }
    }
}

// [2] UI Dragging & Resizing
function initUIDragging() {
    document.querySelectorAll('.glass-panel').forEach(panel => {
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;

        panel.onpointerdown = (e) => {
            // 1. 리사이즈 핸들 클릭 감지 (우측 하단 20px 영역)
            // 브라우저의 'resize: both' 핸들과 드래그 로직이 충돌하는 것을 방지
            const isResizeHandle = (e.offsetX > panel.offsetWidth - 20) && (e.offsetY > panel.offsetHeight - 20);
            if (isResizeHandle) return;

            // 2. 드래그 무시 조건: 특정 태그이거나, Ctrl 키가 눌렸거나, 'no-drag' 클래스 계열인 경우
            const isInteractive = e.target.closest('button, select, input, a, .finance-item, .no-drag');
            if (isInteractive || e.ctrlKey) {
                return;
            }

            e.stopPropagation();

            p3 = e.clientX;
            p4 = e.clientY;

            panel.setPointerCapture(e.pointerId);

            panel.onpointerup = (ev) => {
                panel.releasePointerCapture(ev.pointerId);
                panel.onpointerup = null;
                panel.onpointermove = null;

                // 위치 및 크기 데이터 업데이트
                uiPositions[panel.id] = {
                    leftRatio: panel.offsetLeft / window.innerWidth,
                    topRatio: panel.offsetTop / window.innerHeight,
                    width: panel.style.width,
                    height: panel.style.height
                };

                saveState();
            };

            panel.onpointermove = (ev) => {
                p1 = p3 - ev.clientX; p2 = p4 - ev.clientY;
                p3 = ev.clientX; p4 = ev.clientY;
                panel.style.top = (panel.offsetTop - p2) + "px";
                panel.style.left = (panel.offsetLeft - p1) + "px";
                panel.style.right = 'auto'; panel.style.bottom = 'auto';
            };
        };

        // 리사이즈 종료 시 크기 저장 (드래그가 아닌 순수 리사이즈 대응)
        panel.onmouseup = () => {
            if (uiPositions[panel.id]) {
                uiPositions[panel.id].width = panel.style.width;
                uiPositions[panel.id].height = panel.style.height;
                saveState();
            }
        };
    });
}

function applyUIPositions() {
    for (const [id, pos] of Object.entries(uiPositions)) {
        const el = document.getElementById(id);
        if (el) {
            // 위치 복구
            if (pos.leftRatio !== undefined && pos.topRatio !== undefined) {
                el.style.left = (pos.leftRatio * window.innerWidth) + "px";
                el.style.top = (pos.topRatio * window.innerHeight) + "px";
            } else if (pos.left && pos.top) {
                el.style.left = pos.left;
                el.style.top = pos.top;
            }

            // 크기 복구 (저장된 크기가 있는 경우)
            if (pos.width) el.style.width = pos.width;
            if (pos.height) el.style.height = pos.height;

            el.style.right = 'auto'; el.style.bottom = 'auto';
        }
    }
}

// [3] Mouse Interactions (Zoom/Move)
function initInteractions() {
    const canvas = document.getElementById('live2d-canvas');

    // 포인터 이벤트로 통합하여 PIXI 엔진과의 호환성 유지 적용
    canvas.onpointerdown = (e) => {
        // [수정] 마우스 오른쪽 버튼(button === 2) 클릭 시 랜덤 모션 재생
        if (e.button === 2) {
            playRandomMotion();
            return;
        }

        // 마우스 왼쪽 버튼(button === 0)일 때만 드래그 시작
        if (e.button !== 0) return;

        isDraggingCanvas = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    };

    // [추가] 캔버스 위에서 우클릭 시 브라우저 메뉴가 뜨지 않도록 차단
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    window.onpointermove = (e) => {
        if (!isDraggingCanvas) return;
        offsetX += (e.clientX - lastMouseX);
        offsetY += (e.clientY - lastMouseY);
        lastMouseX = e.clientX; lastMouseY = e.clientY;
        if (window._lastAdjust) window._lastAdjust();
        saveState();
    };

    window.onpointerup = (e) => {
        isDraggingCanvas = false;
    };
    window.addEventListener('wheel', (e) => {
        e.preventDefault();

        // 사용자의 요청에 따라 휠 방향에 맞춰 0.1 단위로 고정 증감
        userZoom = Math.min(Math.max(0.1, userZoom + (e.deltaY > 0 ? -0.1 : 0.1)), 5.0);

        if (window._lastAdjust) window._lastAdjust();
        saveState();
    }, { passive: false });
}

// [4] Helper for Model List
async function refreshModelList(currentModel) {
    try {
        const response = await fetch('/list_models');
        const models = await response.json();
        const select = document.getElementById('model-select');
        select.innerHTML = '';
        models.forEach(model => {
            const opt = document.createElement('option');
            opt.value = model; opt.innerText = model.replace('_vts', '').toUpperCase() + " Unit";
            if (model === currentModel) opt.selected = true;
            select.appendChild(opt);
        });
        select.onchange = (e) => loadModel(e.target.value);
    } catch (e) { }
}

// [5] Tactical Briefing Trigger
function initBriefingTrigger() {
    const titlePanel = document.getElementById('p-title');
    if (!titlePanel) return;

    titlePanel.style.cursor = 'pointer';
    titlePanel.title = "Click to run AI Tactical Briefing";

    titlePanel.onclick = async () => {
        const titleEl = document.getElementById('main-title');
        const originalText = titleEl.innerText;

        try {
            // 로딩 상태 표시
            titleEl.innerText = "ALYZING DATA...";
            titleEl.style.opacity = "0.5";

            const res = await fetch('/tactical_briefing');
            const data = await res.json();

            if (data.briefing) {
                // [고도화 5] 감정 엔진 적용
                applyAvatarSentiment(data.sentiment);

                // [고도화 4] 시각화 힌트 전달
                speakTTS(data.briefing, data.audio_url, data.visual_type);
            }
        } catch (e) {
            console.error("Briefing failed:", e);
        } finally {
            titleEl.innerText = originalText;
            titleEl.style.opacity = "1";
        }
    };
}

/**
 * [추가] 특정 위젯에 대한 AI 브리핑 실행
 * @param {string} type 'news', 'finance', 'calendar' 등
 */
async function triggerWidgetBriefing(type) {
    const btn = event?.currentTarget;
    if (btn) btn.classList.add('loading-pulse');

    try {
        // [수정] 전체 보고가 아닌 특정 위젯 전용 보고 엔드포인트 호출
        const res = await fetch(`/widget_briefing/${type}`);
        const data = await res.json();

        if (data.briefing) {
            applyAvatarSentiment(data.sentiment);
            speakTTS(data.briefing, data.audio_url, type);
        }
    } catch (e) {
        console.error("Widget briefing failed:", e);
    } finally {
        if (btn) btn.classList.remove('loading-pulse');
    }
}

// 감정에 따른 아바타 반응 맵핑 (이벤트 기반 전환)
function applyAvatarSentiment(sentiment) {
    switch (sentiment) {
        case 'happy':
            window.dispatchAvatarEvent('MOTION', { file: "Joy.motion3.json" });
            window.dispatchAvatarEvent('EMOTION', { file: "Smile.exp3.json" });
            break;
        case 'serious':
            window.dispatchAvatarEvent('MOTION', { file: "SignShock.motion3.json" });
            window.dispatchAvatarEvent('EMOTION', { file: "Sorrow.exp3.json" });
            break;
        case 'alert':
            window.dispatchAvatarEvent('MOTION', { file: "Shock.motion3.json" });
            window.dispatchAvatarEvent('EMOTION', { file: "SignShock.exp3.json" });
            break;
        default:
            window.dispatchAvatarEvent('MOTION', { file: "TapBody.motion3.json" });
            break;
    }
}

// [6] Random Motion Player
function playRandomMotion() {
    if (!modelAssets || !modelAssets.motions || modelAssets.motions.length === 0) return;
    const randomIndex = Math.floor(Math.random() * modelAssets.motions.length);
    const motionFile = modelAssets.motions[randomIndex];
    window.dispatchAvatarEvent('MOTION', { file: motionFile });
}
