// --- 스튜디오 모델: 모델 로딩 및 실운영 적용 로직 ---

/**
 * 서버로부터 테스트 모델 목록을 가져와 드롭다운 메뉴를 갱신합니다.
 */
async function refreshModelList() {
    try {
        const res = await fetch('/studio/api/models');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const models = await res.json();
        const select = document.getElementById('model-select');

        if (models.length === 0) {
            select.innerHTML = '<option value="">No models found</option>';
            return;
        }

        select.innerHTML = '<option value="">Select a model</option>';
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.innerText = m;
            select.appendChild(opt);
        });

        // 모델 선택 시 즉시 로딩 트리거
        select.onchange = (e) => loadModel(e.target.value);
    } catch (e) {
        console.error("Model list refresh failed", e);
        document.getElementById('model-select').innerHTML = `<option value="">Error: ${e.message}</option>`;
    }
}

async function loadModel(name) {
    if (!name) return;
    const select = document.getElementById('model-select');
    if (select) select.disabled = true; // 로딩 중 중복 선택 방지

    console.log(`[Studio] Loading: ${name}`);

    document.getElementById('model-controls').style.display = 'block';
    document.getElementById('alias-sidebar').style.display = 'flex';
    document.getElementById('simulator-panel').style.display = 'flex';
    if (typeof cancelMapping === 'function') cancelMapping();

    if (window.currentAvatar) {
        try {
            window.app.stage.removeChild(window.currentAvatar);
            window.currentAvatar.destroy({ children: true });
        } catch (e) {
            console.warn("[Studio] Avatar destroy error (safe to ignore):", e);
        }
        window.currentAvatar = null;
    }

    try {
        const warningBox = document.getElementById('model-warning');
        const warningText = document.getElementById('warning-text');
        if (warningBox) warningBox.style.display = 'none';

        const res = await fetch(`/studio/api/model_info/${name}`);
        const data = await res.json();
        window.modelAssets = data;
        window.currentAliasData = data.aliases || { motions: {}, expressions: {} };

        // 적합성 검사 (사용불가 사유 체크)
        let reasons = [];
        if (!data.motions || data.motions.length === 0) reasons.push(_t('studio.messages.no_motions'));
        if (!data.expressions || data.expressions.length === 0) reasons.push(_t('studio.messages.no_expressions'));

        if (reasons.length > 0 && warningBox && warningText) {
            warningText.innerText = reasons.join(" ");
            warningBox.style.display = 'block';
        }

        if (typeof updateEditor === 'function') updateEditor();
        if (typeof initSimulator === 'function') initSimulator();

        // 관리 버튼 제어
        const saveBtn = document.getElementById('save-alias-btn');
        if (saveBtn) {
            saveBtn.disabled = !window.isSponsor;
            if (!window.isSponsor) saveBtn.innerText = "Sponsor Only (Locked)";
        }

        const url = `/studio/models/${name}/${data.model_settings_file}`;
        const modelRes = await fetch(url);
        const modelJson = await modelRes.json();
        modelJson.url = url;

        // 에셋 레퍼런스 주입
        if (window.modelAssets.expressions && window.modelAssets.expressions.length > 0) {
            modelJson.FileReferences = modelJson.FileReferences || {};
            modelJson.FileReferences.Expressions = window.modelAssets.expressions.map(e => ({
                Name: e.split('/').pop().replace(/\.exp3?\.json/, ''),
                File: e
            }));
        }
        if (window.modelAssets.motions && window.modelAssets.motions.length > 0) {
            modelJson.FileReferences = modelJson.FileReferences || {};
            modelJson.FileReferences.Motions = { "AllMotions": window.modelAssets.motions.map(m => ({ File: m })) };
        }

        window.currentAvatar = await PIXI.live2d.Live2DModel.from(modelJson, { autoInteract: false });
        window.currentAvatar.eventMode = 'static';

        window.app.stage.addChild(window.currentAvatar);

        setupAnimationLoop(window.currentAvatar);
        if (typeof renderAssetLists === 'function') renderAssetLists();
        adjustLayout();

    } catch (e) {
        console.error("Model load failed", e);
    } finally {
        if (select) select.disabled = false; // 로딩 완료 후 다시 활성화
    }
}

/**
 * 현재 작업 중인 테스트 모델을 실운영 폴더(models/)로 배포합니다.
 * 이 작업은 스폰서 권한이 필요하며, 기존 파일을 덮어쓰므로 주의가 필요합니다.
 */
async function applyModelToAegis() {
    if (!window.isSponsor) {
        alert(_t('studio.messages.sponsor_only'));
        return;
    }
    const name = document.getElementById('model-select').value;
    if (!name) {
        alert(_t('studio.messages.select_first'));
        return;
    }

    const confirmMsg = _t('studio.messages.apply_confirm').replace('{name}', name);
    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const btn = document.getElementById('apply-to-aegis-btn');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "Applying...";

        const res = await fetch(`/studio/api/apply_model/${name}`, { method: 'POST' });
        const result = await res.json();

        btn.disabled = false;
        btn.innerText = originalText;

        if (res.ok) {
            // 브라우저의 로컬 스토리지에 마지막 사용 모델 정보를 업데이트하여 
            // 대시보드로 복귀 시 즉시 반영되도록 합니다.
            try {
                const localDataRaw = localStorage.getItem('aegis_layout');
                if (localDataRaw) {
                    const localData = JSON.parse(localDataRaw);
                    localData.last_model = name;
                    localStorage.setItem('aegis_layout', JSON.stringify(localData));
                    console.log(`[Studio] LocalStorage synced: ${name}`);
                }
            } catch (err) {
                console.warn("[Studio] LocalStorage sync failed", err);
            }
            alert(result.message);
        } else {
            alert("Error: " + result.message);
        }
    } catch (e) {
        alert("Apply failed: " + e.message);
        document.getElementById('apply-to-aegis-btn').disabled = false;
    }
}

function setupAnimationLoop(avatar) {
    let mouthParamId = "ParamMouthOpen";
    if (avatar.internalModel) {
        avatar.internalModel.on('beforeModelUpdate', () => {
            if (!window.animationManager) return;
            const time = Date.now() * 0.001;
            const params = window.animationManager.getAnimationParams(0, time);
            const coreModel = avatar.internalModel.coreModel;

            const setParam = (id3, id2, value) => {
                if (typeof coreModel.setParameterValueById === 'function') coreModel.setParameterValueById(id3, value);
                else if (typeof coreModel.setParamFloat === 'function') coreModel.setParamFloat(id2, value);
            };

            if (params.angleZ !== 0) setParam("ParamAngleZ", "PARAM_ANGLE_Z", params.angleZ);
            if (params.bodyX !== 0) setParam("ParamBodyAngleX", "PARAM_BODY_ANGLE_X", params.bodyX);
            if (params.mouthOpen > 0) setParam(mouthParamId, mouthParamId, params.mouthOpen);
        });

        const ids = avatar.internalModel.coreModel._parameterIds || [];
        if (ids.includes("ParamMouthOpen")) mouthParamId = "ParamMouthOpen";
        else if (ids.includes("ParamMouthOpenY")) mouthParamId = "ParamMouthOpenY";
        else mouthParamId = "PARAM_MOUTH_OPEN_Y";
    }
}

async function fixModel() {
    if (!window.isSponsor) {
        alert(_t('studio.messages.sponsor_only'));
        return;
    }
    const name = document.getElementById('model-select').value;
    if (!name) {
        alert(_t('studio.messages.select_first'));
        return;
    }

    const confirmMsg = _t('studio.messages.fix_confirm').replace('{name}', name);
    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const btn = document.getElementById('fix-model-btn');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "⏳";

        const res = await fetch(`/studio/api/fix_model/${name}`, { method: 'POST' });
        const result = await res.json();

        btn.disabled = false;
        btn.innerText = originalText;

        if (res.ok) {
            let report = `${_t('studio.messages.fix_report_title').replace('{name}', name)}\n\n`;
            report += `${_t('studio.messages.fix_folder_renamed')}: ${result.folder_renamed ? '✅ ' + _t('studio.messages.done') : '➖'}\n`;
            report += `${_t('studio.messages.fix_json_standardized')}: ${result.json_standardized ? '✅ ' + _t('studio.messages.done') : '➖'}\n`;
            report += `${_t('studio.messages.fix_paths_fixed')}: ${result.paths_fixed}\n`;
            report += `${_t('studio.messages.fix_alias_generated')}: ${result.alias_generated ? '✅ ' + _t('studio.messages.success') : '➖'}\n\n`;
            report += `${_t('studio.messages.fix_backup_loc')}`;

            alert(report);
            loadModel(name);
        } else {
            alert("Error: " + result.message);
        }
    } catch (e) {
        alert("Fix failed: " + e.message);
        document.getElementById('fix-model-btn').disabled = false;
        document.getElementById('fix-model-btn').innerText = "✨";
    }
}

