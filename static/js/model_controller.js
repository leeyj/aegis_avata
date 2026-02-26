/**
 * AEGIS Model Controller
 * Handles Live2D model loading, asset mapping, and public control APIs.
 */

window.modelAssets = { motions: [], expressions: [], aliases: { motions: {}, expressions: {} } };
let mouthParamId = "ParamMouthOpen"; // Default for akari_vts

/**
 * 전역 모델 로드 함수
 */
async function loadModel(name) {
    if (!name) return;

    // 주요 이벤트 발생 시 서버 백업 (비동기 처리)
    if (window.persistToServer) window.persistToServer();

    window.activeModelName = name; // core.js의 전역 변수와 동기화

    if (window.currentAvatar) {
        try {
            window.app.stage.removeChild(window.currentAvatar);
            if (typeof window.currentAvatar.destroy === 'function') {
                window.currentAvatar.destroy({ children: true });
            }
        } catch (e) {
            console.warn("[Model] Sync destroy error:", e);
        }
        window.currentAvatar = null;
    }

    try {
        const res = await fetch(`/model_info/${name}`);
        if (!res.ok) throw new Error(`Model info fetch failed: ${name}`);
        window.modelAssets = await res.json();

        const settingsFile = window.modelAssets.model_settings_file || `${name.replace('_vts', '')}.model3.json`;
        const url = `/models/${name}/${settingsFile}`;

        if (window.logger) {
            window.logger.info(`[Model] Loading ${name} via ${settingsFile}. Assets: Expressions=${window.modelAssets.expressions.length}, Motions=${window.modelAssets.motions.length}`);
        }

        // Inject expressions and motions into model JSON
        const modelRes = await fetch(url);
        if (!modelRes.ok) throw new Error(`Failed to load model file: ${url}`);
        const modelJson = await modelRes.json();
        modelJson.url = url;

        if (window.modelAssets.expressions && window.modelAssets.expressions.length > 0) {
            // Cubism 3/4 형식
            modelJson.FileReferences = modelJson.FileReferences || {};
            modelJson.FileReferences.Expressions = window.modelAssets.expressions.map(e => ({
                Name: e.split('/').pop().replace('.exp3.json', '').replace('.exp.json', ''),
                File: e
            }));

            // Cubism 2 형식
            modelJson.expressions = window.modelAssets.expressions.map(e => ({
                name: e.split('/').pop().replace('.exp3.json', '').replace('.exp.json', ''),
                file: e
            }));
        }

        if (window.modelAssets.motions && window.modelAssets.motions.length > 0) {
            // Cubism 3/4 형식
            modelJson.FileReferences = modelJson.FileReferences || {};
            modelJson.FileReferences.Motions = {
                "AllMotions": window.modelAssets.motions.map(m => ({
                    File: m
                }))
            };

            // Cubism 2 형식
            modelJson.motions = modelJson.motions || {};
            modelJson.motions.AllMotions = window.modelAssets.motions.map(m => ({
                file: m
            }));
        }

        window.currentAvatar = await PIXI.live2d.Live2DModel.from(modelJson, { autoInteract: false });
        window.app.stage.addChild(window.currentAvatar);

        // [핵심 로직] 모델의 내부 업데이트 루프에 직접 개입하여 파라미터 강제 주입
        window.currentAvatar.internalModel.on('beforeModelUpdate', () => {
            if (!window.animationManager) return;

            const time = Date.now() * 0.001;
            const params = window.animationManager.getAnimationParams(0, time);
            const coreModel = window.currentAvatar.internalModel.coreModel;

            // Cubism 3/4 (setParameterValueById) 와 Cubism 2 (setParamFloat) 통합 지원 헬퍼
            const setParam = (id3, id2, value) => {
                if (typeof coreModel.setParameterValueById === 'function') {
                    coreModel.setParameterValueById(id3, value);
                } else if (typeof coreModel.setParamFloat === 'function') {
                    coreModel.setParamFloat(id2, value);
                }
            };

            if (params.angleZ !== 0) setParam("ParamAngleZ", "PARAM_ANGLE_Z", params.angleZ);
            if (params.bodyX !== 0) setParam("ParamBodyAngleX", "PARAM_BODY_ANGLE_X", params.bodyX);
            if (params.mouthOpen > 0) setParam(mouthParamId, mouthParamId, params.mouthOpen); // mouthParamId는 아래서 자동 매핑
        });

        // 모델 로드 완료 시 파라미터 리스트 진단 및 입 파라미터 최적화
        window.currentAvatar.on('modelLoaded', () => {
            const coreModel = window.currentAvatar.internalModel.coreModel;
            const ids = coreModel._parameterIds || []; // Cubism 2는 이게 없을 수 있으므로 빈 배열로 방어

            if (window.logger) {
                window.logger.info(`[Model] Loaded. DNA Count: ${ids.length || 'Unknown (Cubism2)'}`);
            }

            // 입 파라미터 이름 자동 감지
            if (ids.includes("ParamMouthOpen")) {
                mouthParamId = "ParamMouthOpen";
            } else if (ids.includes("ParamMouthOpenY")) {
                mouthParamId = "ParamMouthOpenY";
            } else {
                // Cubism 2 기본 폴백 (통상적인 명칭)
                mouthParamId = "PARAM_MOUTH_OPEN_Y";
            }

            if (window.logger) window.logger.info(`[Model] Using mouth parameter: ${mouthParamId}`);
        });

        // 레이아웃 재조정
        const adjustLayout = () => {
            if (!window.currentAvatar) return;
            const originW = window.currentAvatar.width / window.currentAvatar.scale.x;
            const originH = window.currentAvatar.height / window.currentAvatar.scale.y;

            const baseScale = Math.min((window.innerWidth / originW) * 0.4, (window.innerHeight / originH) * 0.8);
            window.currentAvatar.scale.set(baseScale * window.userZoom);
            window.currentAvatar.anchor.set(0.5, 0.5);
            window.currentAvatar.position.set((window.innerWidth / 2) + window.offsetX, (window.innerHeight / 2) + window.offsetY);
        };

        setTimeout(adjustLayout, 100);
        window.removeEventListener('resize', window._lastAdjust);
        window._lastAdjust = adjustLayout;
        window.addEventListener('resize', adjustLayout);

        if (window.saveSettings) window.saveSettings();
    } catch (e) {
        console.error("[Model] Load Error:", e);
    }
}

/**
 * Public Control API
 */
window.playExpression = async (fileName) => {
    if (!window.currentAvatar || !fileName) return;
    try {
        const expName = fileName.replace('.exp3.json', '').replace('.exp.json', '');
        await window.currentAvatar.expression(expName);
    } catch (e) { }
};

window.playMotionFile = async (fileName) => {
    if (!window.currentAvatar || !window.modelAssets.motions) return;
    const index = window.modelAssets.motions.indexOf(fileName);
    if (index === -1) return;

    try {
        window.currentAvatar.motion("AllMotions", index, 3);
    } catch (e) {
        console.error(`[Model] Motion error:`, e);
    }
};

window.refreshModelList = async (currentModel) => {
    try {
        const response = await fetch('/list_models');
        const models = await response.json();
        const select = document.getElementById('model-select');
        if (!select) return;

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
};
