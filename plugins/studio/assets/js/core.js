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

// [v4.2] IframeEngine Module Interface
export default {
    init: async function (doc, context) {
        window.context = context;
        window._t = (key) => context._t(key); // Legacy i18n support
        console.log("[Studio:Main] Initializing with context...", context);

    // Helper to load legacy scripts in order
    const loadScript = (src) => new Promise((resolve, reject) => {
        console.log(`[Studio:Main] Loading script: ${src}`);
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`[Studio:Main] Loaded script: ${src}`);
            resolve();
        };
        script.onerror = (err) => {
            console.error(`[Studio:Main] Failed to load script: ${src}`, err);
            reject(err);
        };
        document.body.appendChild(script);
    });

    try {
        // 순서대로 로드하여 의존성 유지 (Standalone Window 대응: context.resolve 사용)
        await loadScript(context.resolve('assets/js/model.js'));
        await loadScript(context.resolve('assets/js/alias.js'));
        await loadScript(context.resolve('assets/js/simulator.js'));
        await loadScript(context.resolve('assets/js/ui.js'));

        console.log("[Studio:Main] All scripts loaded. Calling window.initStudio()...");
        
        // [v4.5.2] 라이선스 상태 동기화 (스폰서 권한 인식 오류 해결)
        try {
            const state = await context.getSystemState();
            window.isSponsor = state.isSponsor || false;
            console.log(`[Studio:Main] System state synced. isSponsor: ${window.isSponsor}`);
            
            // UI에 스폰서 뱃지 현시 업데이트
            const badge = document.getElementById('auth-badge');
            if (badge) {
                badge.style.display = window.isSponsor ? 'inline-block' : 'none';
            }
        } catch (err) {
            console.warn("[Studio:Main] Failed to sync system state:", err);
            window.isSponsor = false;
        }

        // 모든 스크립트 로드 후 초기화 실행
        await window.initStudio();
        
        console.log("[Studio:Main] Binding sliders...");
        // 슬라이더 바인딩
        setupSliders();

        console.log("[Studio:Main] All components initialized successfully.");
        } catch (e) {
            console.error("[Studio:Main] Failed to load components:", e);
        }
    }
};

/**
 * [v4.0.1] 스튜디오 초기화 통합 관리
 */
window.initStudio = async function() {
    console.log("[Studio:Main] Running initStudio...");
    if (typeof initPixiApp === 'function') initPixiApp();
    if (typeof refreshModelList === 'function') await refreshModelList();
    if (typeof initSimulator === 'function') await initSimulator();
    if (typeof window.adjustLayout === 'function') window.adjustLayout();
};

/**
 * [v4.0.1] 아바타 레이아웃 재조정 (캔버스 중앙 정렬 및 줌 대응)
 */
window.adjustLayout = function() {
    if (!window.currentAvatar) return;

    // 모델의 원본 크기 추출
    const originW = window.currentAvatar.width / window.currentAvatar.scale.x;
    const originH = window.currentAvatar.height / window.currentAvatar.scale.y;

    if (originW === 0 || originH === 0) {
        // 크기가 아직 계산되지 않았다면 잠시 후 재시도
        setTimeout(window.adjustLayout, 50);
        return;
    }

    // 화면 크기에 맞춘 기본 배율 계산 (가로 40% 또는 세로 80% 중 작은 값)
    const baseScale = Math.min((window.innerWidth / originW) * 0.4, (window.innerHeight / originH) * 0.8);
    const finalScale = baseScale * (window.userZoom || 1.0);
    
    window.currentAvatar.scale.set(finalScale);
    window.currentAvatar.anchor.set(0.5, 0.5);

    // 중앙 배치 + 사용자 오프셋 적용
    const posX = (window.innerWidth / 2) + (window.offsetX || 0);
    const posY = (window.innerHeight / 2) + (window.offsetY || 0);
    window.currentAvatar.position.set(posX, posY);
};

window.addEventListener('resize', () => window.adjustLayout());

// 슬라이더 바인딩 (V4 동적 생성 대응)
function setupSliders() {
    const zoomSlider = document.getElementById('zoom-slider');
    const posXSlider = document.getElementById('offsetX-slider');
    const posYSlider = document.getElementById('offsetY-slider');

    if (zoomSlider) zoomSlider.oninput = (e) => { window.userZoom = parseFloat(e.target.value); window.adjustLayout(); };
    if (posXSlider) posXSlider.oninput = (e) => { window.offsetX = parseInt(e.target.value); window.adjustLayout(); };
    if (posYSlider) posYSlider.oninput = (e) => { window.offsetY = parseInt(e.target.value); window.adjustLayout(); };
}

// core.js 로드 시 슬라이더 셋업 시도
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setupSliders();
} else {
    document.addEventListener('DOMContentLoaded', setupSliders);
}
