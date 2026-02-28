// --- 스튜디오 코어: 글로벌 상태 및 초기화 ---
// window 객체를 통해 각 서로 다른 JS 모듈 간에 데이터를 공유합니다.
window.currentAvatar = null;   // 현재 로드된 Live2D 아바타 객체 (PIXI.live2d)
window.modelAssets = { motions: [], expressions: [], model_settings_file: null }; // 현재 모델의 파일 리스트
window.currentAliasData = { motions: {}, expressions: {} }; // 현재 모델의 alias.json 데이터
window.reactionsData = {};     // AEGIS 전체 리액션 (reactions.json) 데이터
window.mappingContext = null;  // 에일리어스 매핑 중인 상태 (타겟 파일명 등 저장)

window.userZoom = 1.0;         // 사용자 UI 제어 줌 배율
window.offsetX = 0;            // 아바타 수평 오프셋
window.offsetY = 0;            // 아바타 수직 오프셋
window.logger = { info: (msg) => console.log(msg), error: (msg) => console.error(msg) };

/**
 * 스튜디오 시스템을 초기화합니다.
 */
async function initStudio() {
    // 다국어 매니저 초기화 및 적용
    if (window.I18nManager) {
        await I18nManager.init();
        window._t = (key) => I18nManager._t(key);
    }

    // 렌더링된 HTML 데이터셋에서 스폰서 여부를 가져옵니다.
    window.isSponsor = document.body.dataset.isSponsor === 'True';
    initPixiApp(); // renderer.js에 정의된 PIXI 앱 초기화
    window.animationManager = new AnimationManager(); // 공통 애니메이션 매니저 생성
    await refreshModelList(); // 모델 목록 불러오기
}

/**
 * 창 크기나 줌 배율 변경 시 아바타의 위치와 크기를 재계산합니다.
 */
function adjustLayout() {
    if (!window.currentAvatar) return;
    const originW = window.currentAvatar.width / window.currentAvatar.scale.x;
    const originH = window.currentAvatar.height / window.currentAvatar.scale.y;

    // 화면 높이와 너비를 고려하여 아바타가 최적의 크기로 보이도록 기본 배율을 설정합니다.
    const baseScale = Math.min((window.innerWidth / originW) * 0.35, (window.innerHeight / originH) * 0.7);

    window.currentAvatar.scale.set(baseScale * window.userZoom);
    window.currentAvatar.anchor.set(0.5, 0.5);
    window.currentAvatar.position.set((window.innerWidth / 2) + window.offsetX, (window.innerHeight / 2) + window.offsetY);
}

function resetView() {
    window.userZoom = 1.0; window.offsetX = 0; window.offsetY = 0;
    document.getElementById('zoom-slider').value = 1.0;
    document.getElementById('offsetX-slider').value = 0;
    document.getElementById('offsetY-slider').value = 0;
    adjustLayout();
}

window.addEventListener('resize', adjustLayout);
document.addEventListener('DOMContentLoaded', () => {
    const zoomSlider = document.getElementById('zoom-slider');
    const posXSlider = document.getElementById('offsetX-slider');
    const posYSlider = document.getElementById('offsetY-slider');

    if (zoomSlider) zoomSlider.oninput = (e) => { window.userZoom = parseFloat(e.target.value); adjustLayout(); };
    if (posXSlider) posXSlider.oninput = (e) => { window.offsetX = parseInt(e.target.value); adjustLayout(); };
    if (posYSlider) posYSlider.oninput = (e) => { window.offsetY = parseInt(e.target.value); adjustLayout(); };

    initStudio();
});
