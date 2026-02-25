/**
 * AEGIS Core Engine - Live2D & UI Interactions
 */

let app, currentAvatar;
let activeModelName = "";
let userZoom = 1.0;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastMouseX, lastMouseY;

let modelAssets = { motions: [], expressions: [] };
let uiPositions = {};
let panelVisibility = {}; // 패널 가시성 상태 저장

// [1] Initialize PixiJS Application
async function initEngine() {
    const settings = await fetch('/get_settings').then(r => r.json());

    userZoom = settings.zoom || 1.0;
    offsetX = settings.offset_x || 0;
    offsetY = settings.offset_y || 0;
    activeModelName = settings.last_model || "hiyori_vts";
    uiPositions = settings.ui_positions || {};
    panelVisibility = settings.panel_visibility || {};

    app = new PIXI.Application({
        view: document.getElementById("live2d-canvas"),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
    });

    await refreshModelList(activeModelName);
    await loadModel(activeModelName);
    await initSystemUI();
    initInteractions();
    initUIDragging();
    initSidebar(); // 사이드바 초기화
    applyUIPositions();
    applyVisibility(); // 저장된 가시성 적용
    startClock();
    startIntelligence();
}

// [1.2] Sidebar & Visibility Logic
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');

    // 사이드바 토글
    toggleBtn.onclick = () => {
        sidebar.classList.toggle('active');
        toggleBtn.innerText = sidebar.classList.contains('active') ? '✕' : '•••';
    };

    // 가시성 토글 함수를 전역에 등록
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
            // 체크박스 상태도 동기화
            const checkbox = document.querySelector(`input[onchange*="'${id}'"]`);
            if (checkbox) checkbox.checked = isVisible;
        }
    }
}

// [1.5] System UI Setup
async function initSystemUI() {
    try {
        const res = await fetch('/system_config');
        const config = await res.json();

        const mainTitle = document.getElementById('main-title');
        const subTitle = document.getElementById('sub-title');

        if (mainTitle && config.title) {
            mainTitle.innerText = config.title;
            if (config.title_font_size) mainTitle.style.fontSize = config.title_font_size;
            if (config.title_color) mainTitle.style.color = config.title_color;
        }

        if (subTitle && config.subtitle) {
            subTitle.innerText = config.subtitle;
            if (config.subtitle_font_size) subTitle.style.fontSize = config.subtitle_font_size;
        }
    } catch (e) {
        console.error("System UI config error:", e);
    }
}

// [2] UI Dragging Logic
function initUIDragging() {
    const panels = document.querySelectorAll('.glass-panel');
    panels.forEach(panel => {
        makeDraggable(panel);
    });
}

function makeDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    el.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
        el.style.right = 'auto'; // 우측 고정 해제
        el.style.bottom = 'auto'; // 하단 고정 해제
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        // 위치 저장
        uiPositions[el.id] = { top: el.style.top, left: el.style.left };
        saveState();
    }
}

function applyUIPositions() {
    for (const [id, pos] of Object.entries(uiPositions)) {
        const el = document.getElementById(id);
        if (el) {
            el.style.top = pos.top;
            el.style.left = pos.left;
            el.style.right = 'auto';
            el.style.bottom = 'auto';
        }
    }
}

// [3] Model Loading Logic
async function loadModel(name) {
    if (!name) return;
    activeModelName = name;
    if (currentAvatar) {
        app.stage.removeChild(currentAvatar);
        currentAvatar.destroy();
    }
    const url = `/models/${name}/${name.replace('_vts', '')}.model3.json`;
    try {
        currentAvatar = await PIXI.live2d.Live2DModel.from(url, { autoInteract: false });
        app.stage.addChild(currentAvatar);
        const res = await fetch(`/model_info/${name}`);
        modelAssets = await res.json();
        const adjustLayout = () => {
            if (!currentAvatar) return;
            const baseScale = Math.min((window.innerWidth / currentAvatar.width) * 0.4, (window.innerHeight / currentAvatar.height) * 0.8);
            currentAvatar.scale.set(baseScale * userZoom);
            currentAvatar.anchor.set(0.5, 0.5);
            currentAvatar.position.set((window.innerWidth / 2) + offsetX, (window.innerHeight / 2) + offsetY);
        };
        setTimeout(adjustLayout, 100);
        window.removeEventListener('resize', window._lastAdjust);
        window._lastAdjust = adjustLayout;
        window.addEventListener('resize', adjustLayout);
        saveState();
    } catch (e) { console.error(e); }
}

// [4] Persistence
let saveTimeout;
function saveState() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const state = {
            zoom: userZoom,
            offset_x: offsetX,
            offset_y: offsetY,
            last_model: activeModelName,
            ui_positions: uiPositions,
            panel_visibility: panelVisibility
        };
        fetch('/save_settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        }).then(r => r.json()).then(res => { console.log("[SYSTEM] State Saved:", activeModelName); });
    }, 500);
}

// [5] Other Logic (Clock, Intelligence, Interactions)
async function startIntelligence() {
    let weatherConfig = { font_size_temp: "24px", font_size_status: "16px", icon_size: "50px" };
    try {
        const resConfig = await fetch('/weather_config');
        weatherConfig = await resConfig.json();
    } catch (e) { console.error("Weather config error:", e); }

    const updateWeather = async () => {
        try {
            const res = await fetch('/weather');
            const data = await res.json();

            const statusEl = document.getElementById('weather-status');
            const tempEl = document.getElementById('weather-temp');
            const iconEl = document.getElementById('weather-icon');

            if (statusEl && data.status) {
                statusEl.innerText = `${data.status} In ${data.city || 'Seoul'}`;
                tempEl.innerText = data.temp || '--°C';

                // 스타일 적용
                statusEl.style.fontSize = weatherConfig.font_size_status;
                tempEl.style.fontSize = weatherConfig.font_size_temp;

                // 아이콘 처리
                if (data.icon && iconEl) {
                    iconEl.src = `http://openweathermap.org/img/wn/${data.icon}@2x.png`;
                    iconEl.style.display = 'block';
                    iconEl.style.width = weatherConfig.icon_size;
                    iconEl.style.height = weatherConfig.icon_size;
                }
            }

            // 날씨에 따른 아바타 반응
            if (data.status === "RAINY" || data.status === "STORM") {
                if (modelAssets.expressions.includes("EyesCry.exp3.json")) {
                    setExpression("EyesCry.exp3.json");
                }
            } else if (data.status === "SUNNY") {
                if (modelAssets.expressions.includes("EyesLove.exp3.json")) {
                    setExpression("EyesLove.exp3.json");
                } else if (currentAvatar) {
                    currentAvatar.expression();
                }
            }
        } catch (e) { console.error("Intelligence Error:", e); }
    };

    updateWeather();
    setInterval(updateWeather, 600000); // 10분마다 업데이트
}

function initInteractions() {
    // 캔버스 드래그 (아바타 이동)
    const canvas = document.getElementById('live2d-canvas');
    canvas.onmousedown = (e) => { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; };
    window.onmousemove = (e) => {
        if (!isDragging) return;
        offsetX += (e.clientX - lastMouseX);
        offsetY += (e.clientY - lastMouseY);
        lastMouseX = e.clientX; lastMouseY = e.clientY;
        if (window._lastAdjust) window._lastAdjust();
        saveState();
    };
    window.onmouseup = () => { isDragging = false; };
    window.addEventListener('wheel', (e) => {
        e.preventDefault();
        userZoom = Math.min(Math.max(0.1, userZoom + (e.deltaY > 0 ? -0.05 : 0.05)), 5.0);
        if (window._lastAdjust) window._lastAdjust();
        saveState();
    }, { passive: false });
}

async function refreshModelList(currentModel) {
    try {
        const response = await fetch('/list_models');
        const models = await response.json();
        const select = document.getElementById('model-select');
        select.innerHTML = '';
        models.forEach(model => {
            const opt = document.createElement('option');
            opt.value = model;
            opt.innerText = model.replace('_vts', '').toUpperCase() + " Unit";
            if (model === currentModel) opt.selected = true;
            select.appendChild(opt);
        });
        select.onchange = (e) => loadModel(e.target.value);
    } catch (e) { }
}

async function startClock() {
    const clockEl = document.getElementById('clock');
    let clockConfig = { format: "YYYY-MM-DD \\n HH:mm:ss", font_size: "32px" };

    try {
        const res = await fetch('/clock_config');
        clockConfig = await res.json();
    } catch (e) { console.error("Clock config error:", e); }

    // 스타일 적용
    clockEl.style.fontSize = clockConfig.font_size;
    clockEl.style.lineHeight = "1.2";
    if (clockConfig.color) clockEl.style.color = clockConfig.color;

    const updateTime = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        let formatStr = clockConfig.format || "HH:mm:ss";
        formatStr = formatStr.replace(/YYYY/g, year)
            .replace(/MM/g, month)
            .replace(/DD/g, day)
            .replace(/HH/g, hours)
            .replace(/mm/g, minutes)
            .replace(/ss/g, seconds)
            .replace(/SS/g, seconds); // 대문자 SS 지원

        // \n 또는 <br> 처리
        clockEl.innerHTML = formatStr.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');

        fetch('/trading_data').then(r => r.json()).then(d => {
            const profitEl = document.getElementById('profit-val');
            if (profitEl) profitEl.innerText = d.profit;
        });
    };

    updateTime();
    setInterval(updateTime, 1000);
}

window.onload = initEngine;
