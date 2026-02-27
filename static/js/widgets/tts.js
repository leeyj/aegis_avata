/**
 * AEGIS Widget Module - VOICEVOX TTS Implementation
 */
let currentAudio = null;
let bubbleTimer = null;
let briefingConfig = { color: 'rgba(255, 215, 0, 0.8)', max_width: '400px', font_size: '16px' };

async function applyBriefingConfig() {
    try {
        const res = await fetch('/bref_config');
        const data = await res.json();
        Object.assign(briefingConfig, data);

        const bubble = document.getElementById('speech-bubble');
        if (bubble) {
            // CSS 변수 업데이트 (말풍선 본체 및 꼬리 색상, 크기 통합 연동)
            document.documentElement.style.setProperty('--bubble-color', briefingConfig.color);
            document.documentElement.style.setProperty('--bubble-max-width', briefingConfig.max_width);
            document.documentElement.style.setProperty('--bubble-font-size', briefingConfig.font_size);
        }
    } catch (e) { console.error("Failed to load briefing config:", e); }
}

// [수정] 음성 재생 큐 및 상태 관리
let ttsQueue = [];
let isTtsPlaying = false;

/**
 * HTML 태그를 제거하고 순수 텍스트만 추출하는 헬퍼 함수
 */
function stripHtml(html) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

async function speakTTS(text, audioUrl = null, visualType = 'none', speechText = null) {
    if (!text) return;

    // 음성으로 읽을 텍스트 결정 (명시적 speechText가 없으면 HTML 제거 후 사용)
    const finalSpeechText = speechText || stripHtml(text);

    // 큐에 요청 추가 (말풍선용 text와 음성용 speechText 분리 저장)
    ttsQueue.push({ text, audioUrl, visualType, speechText: finalSpeechText });

    // 현재 재생 중이 아니라면 큐 처리 시작
    if (!isTtsPlaying) {
        processTtsQueue();
    }
}

async function processTtsQueue() {
    if (ttsQueue.length === 0) {
        isTtsPlaying = false;
        return;
    }

    isTtsPlaying = true;
    const { text, audioUrl, visualType, speechText } = ttsQueue.shift();

    // 말풍선 표시 로직
    const bubble = document.getElementById('speech-bubble');
    if (bubble) {
        const iconMap = { 'weather': '🌤️', 'finance': '📈', 'calendar': '📅', 'email': '📧', 'notion': '📓' };
        const icon = iconMap[visualType] || '🤖';
        const textEl = document.getElementById('bubble-text');
        if (textEl) {
            textEl.innerHTML = `<div style="font-size: 24px; margin-bottom: 8px;">${icon}</div>${text}`;
        }
        bubble.style.display = 'block';

        bubble.onclick = () => {
            bubble.style.display = 'none';
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }
            if (window.stopVisualizer) window.stopVisualizer();
            window.dispatchAvatarEvent('TTS_STOP'); // 아바타 애니메이션 중단
            clearTimeout(bubbleTimer);
            isTtsPlaying = false;
            processTtsQueue(); // 다음 항목으로 이동
        };

        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(() => {
            bubble.style.display = 'none';
        }, 120000);
    }

    // 오디오 재생 로직
    const playAudio = (audioObj) => {
        currentAudio = audioObj;
        currentAudio.play().then(() => {
            if (window.startVisualizer) window.startVisualizer(currentAudio);
            window.dispatchAvatarEvent('TTS_START');
        }).catch(e => {
            console.error("Audio play failed:", e);
            finishTts();
        });

        currentAudio.onended = () => {
            finishTts();
        };
    };

    const finishTts = () => {
        if (window.stopVisualizer) window.stopVisualizer();
        window.dispatchAvatarEvent('TTS_STOP');
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(() => {
            if (bubble) bubble.style.display = 'none';
        }, 2000);

        // 약간의 간격을 두고 다음 큐 처리
        setTimeout(() => processTtsQueue(), 500);
    };

    if (audioUrl) {
        playAudio(new Audio(audioUrl));
    } else {
        try {
            const response = await fetch('/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: speechText })
            });
            const data = await response.json();
            if (data.status === 'success' && data.url) {
                playAudio(new Audio(data.url));
            } else {
                finishTts();
            }
        } catch (e) {
            console.error("TTS Error:", e);
            finishTts();
        }
    }
}

// [고도화 2] 능동형 상황 보고 에이전트
function startProactiveAgent() {
    // 15분마다 자동으로 상황 체크 및 필요 시 브리핑 수행
    setInterval(async () => {
        // 현재 브리핑 중이 아니고, 화면이 활성화된 상태일 때만 수행
        if (!currentAudio && !document.hidden) {
            // console.log("[AEGIS] Proactive status check initiated...");
            const titlePanel = document.getElementById('p-title');
            if (titlePanel) titlePanel.click(); // 기존 브리핑 로직 트리거
        }
    }, 900000); // 15분 (900,000ms)
}
