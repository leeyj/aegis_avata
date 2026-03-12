/**
 * AEGIS Model Controller
 * Handles Live2D model loading, asset mapping, and public control APIs.
 */

import ModelLayout from './core/model_layout.js';
import ModelSync from './core/model_sync.js';
import messageBroker from './core/message_broker.js';

window.modelAssets = { motions: [], expressions: [], aliases: { motions: {}, expressions: {} } };

/**
 * 전역 모델 로드 함수
 */
async function loadModel(name) {
    if (!name) {
        console.warn("[Model] No model name provided to loadModel.");
        return;
    }
    console.log(`[Model] >>> loadModel("${name}") triggered.`);
    if (window.logger) window.logger.info(`[Model] loadModel("${name}") triggered.`);

    if (window.persistToServer) window.persistToServer();
    window.activeModelName = name;

    const hud = document.getElementById('model-loading-hud');
    if (hud) {
        console.log("[Model] Activating Loading HUD.");
        if (window.logger) window.logger.info("[Model] Activating Loading HUD.");
        hud.classList.remove('hidden');
        hud.classList.add('active');
    }

    if (!window.app || !window.app.stage) {
        console.log(`[Model] Renderer (app/stage) not ready for "${name}". Deferring...`);
        if (window.logger) window.logger.warn(`[Model] Renderer not ready for ${name}`);
        setTimeout(() => loadModel(name), 100);
        return;
    }

    console.log(`[Model] Stage ready. Clearing previous avatar...`);
    if (window.logger) window.logger.info(`[Model] Stage ready. Clearing previous avatar...`);
    if (window.currentAvatar) {
        try {
            window.app.stage.removeChild(window.currentAvatar);
            if (typeof window.currentAvatar.destroy === 'function') {
                window.currentAvatar.destroy({ children: true });
            }
            console.log("[Model] Previous avatar destroyed.");
        } catch (e) {
            console.warn("[Model] Sync destroy error:", e);
        }
        window.currentAvatar = null;
    }

    try {
        const infoUrl = `/api/plugins/unit-select/info/${name}`;
        console.log(`[Model] Fetching info from: ${infoUrl}`);
        const res = await fetch(infoUrl);
        if (!res.ok) throw new Error(`Model info fetch failed (HTTP ${res.status}): ${name}`);

        window.modelAssets = await res.json();
        console.log("[Model] Assets info received:", window.modelAssets);
        if (window.logger) window.logger.info(`[Model] Assets info received for ${name}`);

        const settingsFile = window.modelAssets.model_settings_file || `${name.replace('_vts', '')}.model3.json`;
        const url = `/api/plugins/unit-select/files/${name}/${settingsFile}`;
        console.log(`[Model] Target model JSON: ${url}`);

        if (window.logger) {
            window.logger.info(`[Model] Loading ${name} via ${settingsFile}. Assets: Expressions=${window.modelAssets.expressions.length}, Motions=${window.modelAssets.motions.length}`);
        }

        console.log(`[Model] Fetching model JSON...`);
        if (window.logger) window.logger.info(`[Model] Fetching model JSON: ${url}`);
        const modelRes = await fetch(url);
        if (!modelRes.ok) throw new Error(`Failed to load model file (HTTP ${modelRes.status}): ${url}`);
        const modelJson = await modelRes.json();
        console.log("[Model] Model JSON fetched successfully.");
        if (window.logger) window.logger.info("[Model] Model JSON fetched successfully.");
        modelJson.url = url;

        if (window.modelAssets.expressions && window.modelAssets.expressions.length > 0) {
            modelJson.FileReferences = modelJson.FileReferences || {};
            modelJson.FileReferences.Expressions = window.modelAssets.expressions.map(e => ({
                Name: e.split('/').pop().replace('.exp3.json', '').replace('.exp.json', ''),
                File: e
            }));
            modelJson.expressions = window.modelAssets.expressions.map(e => ({
                name: e.split('/').pop().replace('.exp3.json', '').replace('.exp.json', ''),
                file: e
            }));
        }

        if (window.modelAssets.motions && window.modelAssets.motions.length > 0) {
            modelJson.FileReferences = modelJson.FileReferences || {};
            modelJson.FileReferences.Motions = {
                "AllMotions": window.modelAssets.motions.map(m => ({ File: m }))
            };
            modelJson.motions = modelJson.motions || {};
            modelJson.motions.AllMotions = window.modelAssets.motions.map(m => ({ file: m }));
        }

        console.log(`[Model] Initializing PIXI.live2d.Live2DModel...`);
        if (window.logger) window.logger.info("[Model] Initializing PIXI.live2d.Live2DModel...");
        window.currentAvatar = await PIXI.live2d.Live2DModel.from(modelJson, { autoInteract: false });
        console.log("[Model] Live2DModel instance created:", window.currentAvatar);
        if (window.logger) window.logger.info(`[Model] Live2DModel instance created: ${!!window.currentAvatar}`);

        window.app.stage.addChild(window.currentAvatar);
        console.log("[Model] Avatar added to PIXI stage.");
        if (window.logger) window.logger.info("[Model] Avatar added to PIXI stage.");

        window.currentAvatar.eventMode = "static";
        window.currentAvatar.anchor.set(0.5, 0.5);

        window.currentAvatar.on("hit", (area) => {
            const areaName = area.toLowerCase();
            if (areaName.includes("head")) {
                window.dispatchAvatarEvent("EMOTION", { alias: "joy", duration: 3000 });
            } else if (areaName.includes("body") || areaName.includes("bust") || areaName.includes("arm")) {
                window.dispatchAvatarEvent("MOTION", { alias: "touch_body" });
            }
            window.currentAvatar._hitHandled = true;

            // [v4.2.6] Broadcast hit to System Event Bus for sandboxed plugins (e.g. Markov)
            if (messageBroker) {
                console.log("[ModelController] Broadcasting MODEL_HIT (area):", areaName);
                messageBroker.broadcast('SYSTEM_EVENT', { 
                    command: 'MODEL_HIT', 
                    data: { area: areaName } 
                });
            }
        });

        window.currentAvatar.on("pointertap", (e) => {
            if (window.currentAvatar._hitHandled) {
                window.currentAvatar._hitHandled = false;
                return;
            }
            if (e.data.button !== 0) return;

            let targetMotion = "touch_body";
            const hasAlias = window.modelAssets && window.modelAssets.aliases && window.modelAssets.aliases.motions && window.modelAssets.aliases.motions[targetMotion];

            if (hasAlias) {
                window.dispatchAvatarEvent("MOTION", { alias: targetMotion });
            } else if (window.modelAssets && window.modelAssets.motions && window.modelAssets.motions.length > 0) {
                const fallbackFile = window.modelAssets.motions[0];
                window.dispatchAvatarEvent("MOTION", { file: fallbackFile });
            }

            // [v4.2.6] Broadcast generic tap for listeners that don't care about specific hit areas
            if (messageBroker) {
                console.log("[ModelController] Broadcasting MODEL_HIT (generic)");
                messageBroker.broadcast('SYSTEM_EVENT', { 
                    command: 'MODEL_HIT', 
                    data: { area: 'generic' } 
                });
            }
        });

        // ==========================================
        // Delegation to Modular Systems
        // ==========================================
        const mouthParamId = await ModelSync.detectMouthParamId(window.currentAvatar, window.logger);
        ModelSync.applyLipSync(window.currentAvatar, window.animationManager, mouthParamId);

        const adjustLayout = () => {
            if (!ModelLayout.adjustLayout(window.currentAvatar)) {
                setTimeout(adjustLayout, 50);
            }
        };

        setTimeout(adjustLayout, 100);
        setTimeout(adjustLayout, 500);

        window.removeEventListener('resize', window._lastAdjust);
        window._lastAdjust = adjustLayout;
        window.addEventListener('resize', adjustLayout);
        // ==========================================

        if (window.saveSettings) window.saveSettings();

        if (hud) {
            setTimeout(() => {
                hud.classList.remove('active');
                setTimeout(() => hud.classList.add('hidden'), 500);
            }, 800);
        }
    } catch (e) {
        console.error("[Model] Load Error:", e);
        if (window.logger) window.logger.error("[Model] loadModel failed", e);
        if (hud) hud.classList.add('hidden');
    }
}

// Global Exports
window.loadModel = loadModel;

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

window.toggleHitFrames = () => {
    if (!window.currentAvatar) return;
    const show = !window.currentAvatar._hitFramesActive;
    window.currentAvatar._hitFramesActive = show;
};
