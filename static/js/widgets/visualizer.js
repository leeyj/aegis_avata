/**
 * AEGIS Audio Visualizer
 * Real-time audio frequency visualization for TTS
 */

let audioContext, analyser, dataArray, animationId;
const container = document.getElementById('visualizer-container');
const NUM_BARS = 20;
const bars = [];

// 초기 바 생성
function initVisualizer() {
    container.innerHTML = '';
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

    // 오디오 소스 연결
    const source = audioContext.createMediaElementSource(audioElement);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64; // 슬림한 막대를 위해 작은 FFT 사이즈 사용

    source.connect(analyser);
    analyser.connect(audioContext.destination);

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

// 초기화 실행
initVisualizer();

// 외부 노출
window.startVisualizer = startVisualization;
window.stopVisualizer = stopVisualization;
