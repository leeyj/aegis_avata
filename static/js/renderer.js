/**
 * AEGIS Renderer Engine
 * Manages PixiJS Application, Ticker, and Main Animation Loop.
 */

/**
 * PixiJS 애플리케이션 초기화
 */
function initPixiApp() {
    window.app = new PIXI.Application({
        view: document.getElementById("live2d-canvas"),
        autoStart: true,
        backgroundAlpha: 0,
        resizeTo: window,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
    });

    // 메인 애니메이션 루프 등록
    window.app.ticker.add(_updateAnimation);

    if (window.logger) window.logger.info("[Renderer] PixiJS Application initialized.");
}

/**
 * 전역 애니메이션 업데이트 루프
 * AnimationManager로부터 계산된 파라미터를 Live2D 코어 모델에 주입합니다.
 */
function _updateAnimation(delta) {
    if (!window.currentAvatar || !window.currentAvatar.internalModel) return;

    const time = Date.now() * 0.001;
    if (!window.animationManager) return;

    // 통합된 애니메이션 파라미터 획득
    const params = window.animationManager.getAnimationParams(delta, time);

    try {
        const coreModel = window.currentAvatar.internalModel.coreModel;

        // 1. 머리 및 몸 관성 주입
        coreModel.setParameterValueById("ParamAngleZ", params.angleZ);
        coreModel.setParameterValueById("ParamBodyAngleX", params.bodyX);

        // 2. 입 모양 (Lip-sync & Reaction)
        // ParamMouthOpenY는 구버전 호환성을 위해 상시 주입 시도
        if (params.mouthOpen > 0) {
            coreModel.setParameterValueById("ParamMouthOpenY", params.mouthOpen);
        }

        // 참고: 정밀한 입 파라미터 제어는 model_controller.js의 beforeModelUpdate에서 
        // mouthParamId(ParamMouthOpen 등)를 통해 추가로 처리됩니다.
    } catch (e) {
        // 티커 크래시 방지
    }
}
