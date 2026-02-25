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

async function speakTTS(text, audioUrl = null, visualType = 'none') {
    if (!text) return;

    // 말풍선 표시
    const bubble = document.getElementById('speech-bubble');
    if (bubble) {
        const iconMap = {
            'weather': '🌤️',
            'finance': '📈',
            'calendar': '📅',
            'email': '📧'
        };
        const icon = iconMap[visualType] || '🤖';

        // 구조를 유지하며 텍스트와 아이콘만 업데이트
        const textEl = document.getElementById('bubble-text');
        if (textEl) {
            textEl.innerHTML = `<div style="font-size: 24px; margin-bottom: 8px;">${icon}</div>${text}`;
        }

        bubble.style.display = 'block';

        // 클릭 시 즉시 닫기 기능 추가
        bubble.onclick = () => {
            bubble.style.display = 'none';
            if (currentAudio) currentAudio.pause();
            if (window.stopVisualizer) window.stopVisualizer();
        };

        clearTimeout(bubbleTimer);
        // 음성이 재생되지 않을 경우를 대비한 최후의 보루 (2분 후 자동 숨김)
        bubbleTimer = setTimeout(() => {
            bubble.style.display = 'none';
            if (window.stopVisualizer) window.stopVisualizer();
        }, 120000);
    }

    // 이전 재생 중인 오디오가 있다면 중지
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
        if (window.stopVisualizer) window.stopVisualizer(); // 시각화 중지
        window.dispatchAvatarEvent('TTS_STOP');
    }

    const playAudio = (audioObj) => {
        currentAudio = audioObj;
        currentAudio.play().then(() => {
            if (window.startVisualizer) window.startVisualizer(currentAudio); // 시각화 시작
            window.dispatchAvatarEvent('TTS_START'); // 아바타 발화 이벤트 시작
        }).catch(e => {
            console.error("Audio play failed:", e);
            if (window.stopVisualizer) window.stopVisualizer(); // 시각화 중지
            // 재생 실패 시 3초 후 말풍선 닫기
            setTimeout(() => { if (bubble) bubble.style.display = 'none'; }, 3000);
        });

        currentAudio.onended = () => {
            if (window.stopVisualizer) window.stopVisualizer(); // 시각화 중지
            window.dispatchAvatarEvent('TTS_STOP'); // 아바타 발화 이벤트 종료
            clearTimeout(bubbleTimer); // 예비 타이머 취소
            bubbleTimer = setTimeout(() => {
                if (bubble) bubble.style.display = 'none';
            }, 5000);
        };
    };

    if (audioUrl) {
        playAudio(new Audio(audioUrl));
        return;
    }

    try {
        // [수정] POST 요청으로 변경하여 데이터 전달 방식을 routes/ai.py와 일치시킴
        const response = await fetch('/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        const data = await response.json();

        if (data.status === 'success' && data.url) {
            playAudio(new Audio(data.url));
        } else {
            console.warn("TTS generation failed, hiding bubble soon.");
        }
    } catch (e) {
        console.error("TTS Error:", e);
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
