/**
 * AEGIS Audio Visualizer
 * Real-time audio frequency visualization for TTS
 */

let audioContext, analyser, dataArray, animationId;
let sourceNode = null; // 오디오 소스 노드 캐싱
let lastAudioElement = null; // 마지막으로 연결된 요소 추적
let container = null;
const NUM_BARS = 20;
const bars = [];

// 초기 바 생성
function initVisualizer(targetContainer) {
    if (!targetContainer) {
        console.warn("[Visualizer] No target container provided.");
        return;
    }
    container = targetContainer;
    container.innerHTML = '';
    bars.length = 0; // Clear previous references
    for (let i = 0; i < NUM_BARS; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        bar.style.height = '5px';
        container.appendChild(bar);
        bars.push(bar);
    }
}

function startVisualization(audioElement) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 소스 노드 캐싱 로직: 동일한 audioElement에 대해 중복 연결 방지
    if (!sourceNode || lastAudioElement !== audioElement) {
        try {
            sourceNode = audioContext.createMediaElementSource(audioElement);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 64;

            sourceNode.connect(analyser);
            analyser.connect(audioContext.destination);
            lastAudioElement = audioElement;
            console.log("[Visualizer] New audio source connected.");
        } catch (e) {
            console.warn("[Visualizer] Audio source connection reuse or error:", e);
        }
    }

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < NUM_BARS; i++) {
            // 주파수 데이터를 막대 높이로 변환 (0~40px)
            const value = dataArray[i] || 0;
            const height = (value / 255) * 40 + 5;
            if (bars[i]) {
                bars[i].style.height = `${height}px`;
                // 강도에 따른 네온 밝기 조절
                bars[i].style.opacity = 0.5 + (value / 255) * 0.5;
            }
        }
    }

    // 오디오 컨텍스트 재개 (브라우저 정책 대응)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    draw();
}

function stopVisualization() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    // 바 높이 초기화
    bars.forEach(bar => {
        bar.style.height = '5px';
        bar.style.opacity = '0.5';
    });
}

// External 노출 (initVisualizer 추가 노출)
window.initAudioVisualizer = initVisualizer;
window.startVisualizer = startVisualization;
window.stopVisualizer = stopVisualization;
