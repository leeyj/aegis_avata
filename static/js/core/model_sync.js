export default class ModelSync {
    /**
     * Applies lip-sync (and basic body animation variables) from the AnimationManager to the avatar.
     */
    static applyLipSync(avatar, animationManager, mouthParamId) {
        avatar.internalModel.on('beforeModelUpdate', () => {
            if (!animationManager) return;

            const time = Date.now() * 0.001;
            const params = animationManager.getAnimationParams(0, time);
            const coreModel = avatar.internalModel.coreModel;

            const setParam = (id3, id2, value) => {
                if (typeof coreModel.setParameterValueById === 'function') {
                    coreModel.setParameterValueById(id3, value);
                } else if (typeof coreModel.setParamFloat === 'function') {
                    coreModel.setParamFloat(id2, value);
                }
            };

            if (params.angleZ !== 0) setParam("ParamAngleZ", "PARAM_ANGLE_Z", params.angleZ);
            if (params.bodyX !== 0) setParam("ParamBodyAngleX", "PARAM_BODY_ANGLE_X", params.bodyX);
            if (params.mouthOpen > 0) setParam(mouthParamId, mouthParamId, params.mouthOpen);
        });
    }

    /**
     * Detects the correct Mouth Open parameter ID depending on Cubism version and model structure.
     */
    static detectMouthParamId(avatar, logger, defaultId = "ParamMouthOpen") {
        return new Promise((resolve) => {
            const checkIds = (ids) => {
                if (ids.includes("ParamMouthOpen")) return "ParamMouthOpen";
                if (ids.includes("ParamMouthOpenY")) return "ParamMouthOpenY";
                return "PARAM_MOUTH_OPEN_Y"; // Cubism 2
            };

            const onLoaded = () => {
                const coreModel = avatar.internalModel.coreModel;
                const ids = coreModel._parameterIds || [];
                if (logger) {
                    logger.info(`[Model] Loaded. DNA Count: ${ids.length || 'Unknown (Cubism2)'}`);
                }
                const mouthParamId = checkIds(ids);
                if (logger) logger.info(`[Model] Using mouth parameter: ${mouthParamId}`);
                resolve(mouthParamId);
            };

            avatar.on('modelLoaded', onLoaded);

            // Fallback immediately if already loaded
            if (avatar.internalModel && avatar.internalModel.coreModel) {
                 const ids = avatar.internalModel.coreModel._parameterIds || [];
                 resolve(checkIds(ids));
            }
        });
    }
}
