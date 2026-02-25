/**
 * AEGIS Core - Rendering & State Engine
 */

let app, currentAvatar;
let activeModelName = "";
let userZoom = 1.0;
let offsetX = 0;
let offsetY = 0;
let modelAssets = { motions: [], expressions: [] };
let uiPositions = {};
let panelVisibility = {};

// Animation State
let danceMode = false;
let danceTime = 0;
let saveTimeout;

/**
 * Remote Logger - 콘솔 내용을 파일로 저장하기 위해 서버로 전송
 */
const RemoteLogger = {
    buffer: [],
    timer: null,
    info: (msg) => RemoteLogger.add(msg, 'INFO'),
    warn: (msg) => RemoteLogger.add(msg, 'WARN'),
    error: (msg, error) => {
        let text = typeof msg === 'object' ? JSON.stringify(msg) : msg;
        if (error) text += ` | EXCEPTION: ${error.message}\n${error.stack}`;
        RemoteLogger.add(text, 'ERROR');
    },
    add: (msg, level) => {
        let text = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
        // console.log 제거 (파일로그 전송용으로만 사용)
        RemoteLogger.buffer.push({ message: text, level: level });

        // 3초마다 몰아서 전송하도록 타이머 설정
        if (!RemoteLogger.timer) {
            RemoteLogger.timer = setTimeout(() => {
                const logsToSend = RemoteLogger.buffer;
                RemoteLogger.buffer = [];
                RemoteLogger.timer = null;

                if (logsToSend.length === 0) return;

                fetch('/save_log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ logs: logsToSend })
                }).catch(e => { });
            }, 3000);
        }
    }
};
window.logger = RemoteLogger;

// 모델별 파라미터 ID 최적화용
let mouthParamId = "ParamMouthOpen"; // Default for akari_vts

/**
 * [1] Initialize PixiJS Application & Load Settings
 */
async function initEngine() {
    const settings = await fetch('/get_settings').then(r => r.json());

    userZoom = settings.zoom || 1.0;
    offsetX = settings.offset_x || 0;
    offsetY = settings.offset_y || 0;
    activeModelName = settings.last_model || "hiyori_vts";
    uiPositions = settings.ui_positions || {};
    panelVisibility = settings.panel_visibility || {};

    // Device-specific layout restoration
    try {
        const localDataRaw = localStorage.getItem('aegis_layout');
        if (localDataRaw) {
            const localData = JSON.parse(localDataRaw);
            if (localData.uiPositions) uiPositions = localData.uiPositions;
            if (localData.panelVisibility) panelVisibility = localData.panelVisibility;
            if (localData.userZoom !== undefined) userZoom = localData.userZoom;
            if (localData.offsetX !== undefined) offsetX = localData.offsetX;
            if (localData.offsetY !== undefined) offsetY = localData.offsetY;
            // console.log("[Core] Device-specific layout restored.");
        }
    } catch (e) {
        // console.error("[Core] LocalStorage error:", e);
    }

    app = new PIXI.Application({
        view: document.getElementById("live2d-canvas"),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
    });

    // Add Animation Ticker
    app.ticker.add(_updateAnimation);

    await refreshModelList(activeModelName);
    await loadModel(activeModelName);

    // Call external module initializers
    if (typeof initUI === 'function') initUI();
    if (typeof initWidgets === 'function') initWidgets();
}

/**
 * [2] Model Loading & Asset Management
 */
async function loadModel(name) {
    if (!name) return;

    // 주요 이벤트 발생 시 서버 백업 (비동기 처리)
    if (window.persistToServer) window.persistToServer();

    activeModelName = name;

    if (currentAvatar) {
        app.stage.removeChild(currentAvatar);
        currentAvatar.destroy();
    }

    const url = `/models/${name}/${name.replace('_vts', '')}.model3.json`;
    try {
        const res = await fetch(`/model_info/${name}`);
        modelAssets = await res.json();
        window.modelAssets = modelAssets; // 전역 바인딩 보장

        if (window.logger) {
            window.logger.info(`[Core] Assets for ${name} fetched: Expressions=${modelAssets.expressions.length}, Motions=${modelAssets.motions.length}`);
        }

        // Inject expressions and motions into model JSON
        const modelRes = await fetch(url);
        const modelJson = await modelRes.json();
        modelJson.url = url;

        if (modelAssets.expressions && modelAssets.expressions.length > 0) {
            modelJson.FileReferences = modelJson.FileReferences || {};
            modelJson.FileReferences.Expressions = modelAssets.expressions.map(e => ({
                Name: e.replace('.exp3.json', ''),
                File: "expressions/" + e
            }));
        }

        if (modelAssets.motions && modelAssets.motions.length > 0) {
            modelJson.FileReferences = modelJson.FileReferences || {};
            modelJson.FileReferences.Motions = {
                "AllMotions": modelAssets.motions.map(m => ({
                    File: "animations/" + m
                }))
            };
        }

        currentAvatar = await PIXI.live2d.Live2DModel.from(modelJson, { autoInteract: false });
        app.stage.addChild(currentAvatar);

        // [핵심 수정] 모델의 내부 업데이트 루프에 직접 개입하여 파라미터 강제 주입
        currentAvatar.internalModel.on('beforeModelUpdate', () => {
            if (!window.animationManager) return;

            const time = Date.now() * 0.001;
            const params = window.animationManager.getAnimationParams(0, time);
            const coreModel = currentAvatar.internalModel.coreModel;

            // 값이 0이 아닐 때만(활성화 상태일 때만) 주입하여 일반 모션과의 충돌 방지
            // 1. 머리 흔들기 (Angle Z)
            if (params.angleZ !== 0) {
                coreModel.setParameterValueById("ParamAngleZ", params.angleZ);
            }

            // 2. 몸 흔들기 (Body X)
            if (params.bodyX !== 0) {
                coreModel.setParameterValueById("ParamBodyAngleX", params.bodyX);
            }

            // 3. 입 벌리기 (Mouth Open)
            if (params.mouthOpen > 0) {
                coreModel.setParameterValueById(mouthParamId, params.mouthOpen);
            }
        });

        // 모델 로드 완료 시 파라미터 리스트 진단 로그
        currentAvatar.on('modelLoaded', () => {
            const ids = currentAvatar.internalModel.coreModel._parameterIds;
            window.logger.info(`[Core] Model Loaded. DNA Count: ${ids.length}`);
            window.logger.info(`DNA: ${ids.join(", ")}`);

            // 입 파라미터 감지 (akari는 ParamMouthOpen, hiyori는 ParamMouthOpenY 등)
            if (ids.includes("ParamMouthOpen")) mouthParamId = "ParamMouthOpen";
            else if (ids.includes("ParamMouthOpenY")) mouthParamId = "ParamMouthOpenY";

            window.logger.info(`[Core] Using mouth parameter: ${mouthParamId}`);
        });

        const adjustLayout = () => {
            if (!currentAvatar) return;
            const originW = currentAvatar.width / currentAvatar.scale.x;
            const originH = currentAvatar.height / currentAvatar.scale.y;

            const baseScale = Math.min((window.innerWidth / originW) * 0.4, (window.innerHeight / originH) * 0.8);
            currentAvatar.scale.set(baseScale * userZoom);
            currentAvatar.anchor.set(0.5, 0.5);
            currentAvatar.position.set((window.innerWidth / 2) + offsetX, (window.innerHeight / 2) + offsetY);
        };

        setTimeout(adjustLayout, 100);
        window.removeEventListener('resize', window._lastAdjust);
        window._lastAdjust = adjustLayout;
        window.addEventListener('resize', adjustLayout);

        saveSettings();
    } catch (e) {
        console.error("[Core] Load Error:", e);
    }
}

/**
 * [3] Animation & State Logic (Renderer)
 */
function _updateAnimation(delta) {
    if (!currentAvatar || !currentAvatar.internalModel) return;

    // Get integrated parameters from AnimationManager
    // Ticker time can be very large, so we normalize it
    const time = Date.now() * 0.001;
    const params = window.animationManager.getAnimationParams(delta, time);

    try {
        const coreModel = currentAvatar.internalModel.coreModel;

        // Apply parameters to Live2D core model
        // We use common parameter IDs for Cubism 3/4
        coreModel.setParameterValueById("ParamAngleZ", params.angleZ);
        coreModel.setParameterValueById("ParamBodyAngleX", params.bodyX);

        if (params.mouthOpen > 0) {
            coreModel.setParameterValueById("ParamMouthOpenY", params.mouthOpen);
        }

        // Optional: Log every 100th frame to avoid console spamming
        if (Math.floor(time * 10) % 50 === 0 && (params.angleZ !== 0 || params.mouthOpen !== 0)) {
            console.log(`[Core] Animating: Z=${params.angleZ.toFixed(2)}, Mouth=${params.mouthOpen.toFixed(2)}`);
        }
    } catch (e) {
        // Silent fail to prevent ticker crash
    }
}

function saveSettings() {
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
        });
    }, 500);
}

/**
 * [4] Public Control API
 */
window.playExpression = async (fileName) => {
    if (!currentAvatar || !fileName) return;
    try {
        const expName = fileName.replace('.exp3.json', '');
        await currentAvatar.expression(expName);
    } catch (e) { }
};

window.playMotionFile = async (fileName) => {
    if (!currentAvatar || !modelAssets.motions) return;
    const index = modelAssets.motions.indexOf(fileName);
    if (index === -1) return;

    try {
        currentAvatar.motion("AllMotions", index, 3);
    } catch (e) {
        console.error(`[Core] Motion error:`, e);
    }
};

window.onload = initEngine;
