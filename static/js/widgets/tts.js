/**
 * AEGIS Widget Module - VOICEVOX TTS Implementation
 */
const currentAudio = new Audio();
let bubbleTimer = null;
let briefingConfig = { color: 'rgba(255, 215, 0, 0.8)', max_width: '400px', font_size: '16px' };

// [Plugin-X] 전역 서비스 제공자 설정 (시스템 환경 변수에 따라 변경 가능하도록 기본값만 지정)
window.AEGIS_SPEAKER_PROVIDER = window.AEGIS_SPEAKER_PROVIDER || 'proactive-agent';

// 가상/공통 타입용 기본 아이콘 맵. 
// 이후 PluginLoader가 manifest.json에서 각 플러그인(weather, finance 등) 고유 아이콘을 추가(병합)합니다.
window.TTS_ICONS = {
    'email': '📧', 'system': '⚙️', 'alert': '🚨', 'error': '🔴'
};

async function applyBriefingConfig() {
    try {
        const provider = window.AEGIS_SPEAKER_PROVIDER;
        const res = await fetch(`/api/plugins/${provider}/config/briefing`);
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

/**
 * 마크다운 문법을 제거하여 순수 텍스트로 변환합니다.
 */
function stripMarkdown(text) {
    if (!text) return "";
    let cleanText = text
        .replace(/```[\s\S]*?```/g, '') // 코드 블록 제거
        .replace(/`{1,3}/g, '')          // 남은 백틱 제거
        .replace(/^[#*>\-]+\s+/gm, '')   // 헤더, 불렛 등 제거
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // 굵게 제거
        .replace(/(\*|_)(.*?)\1/g, '$2')    // 기울임 제거
        .trim();

    // 1. [태그] 및 (태그) 제거
    cleanText = cleanText.replace(/\[(RESPONSE|VOICE|DISPLAY|AI|ASSISTANT|SYSTEM)\]/gi, "");
    cleanText = cleanText.replace(/\((RESPONSE|AI|ASSISTANT|SYSTEM)\)/gi, "");

    // 2. AI 접두사 제거 (영어/한국어)
    const prefixes = [
        /^Response:\s*/i, /^AI:\s*/i, /^Assistant:\s*/i,
        /^리스폰스:\s*/, /^답변:\s*/, /^AEGIS:\s*/i,
        /^결과:\s*/, /^응답:\s*/, /^###\s*Response\s*/i,
        /^###\s*리스폰스\s*/
    ];

    for (const p of prefixes) {
        cleanText = cleanText.replace(p, "");
    }

    // 3. AI 접미사 제거
    const suffixes = [
        /\s*Response$/i, /\s*End of Response$/i, /\s*리스폰스$/,
        /\s*답변 완료$/, /\s*이상입니다\.?$/
    ];

    for (const s of suffixes) {
        cleanText = cleanText.replace(s, "");
    }

    return cleanText.trim();
}

async function speakTTS(text, audioUrl = null, visualType = 'none', speechText = null) {
    if (!text) {
        console.warn("[TTS] Speak requested with empty text. Skipping.");
        return;
    }

    // 음성으로 읽을 텍스트 결정 (명시적 speechText가 없으면 HTML/마크다운 제거 후 사용)
    const finalSpeechText = speechText ? stripMarkdown(stripHtml(speechText)) : stripMarkdown(stripHtml(text));
    console.log(`[TTS] [ACTION] speakTTS called. Text: "${text.substring(0, 50)}...". AudioURL: ${audioUrl || 'NONE'}`);

    // 큐에 요청 추가 (말풍선용 text와 음성용 speechText 분리 저장)
    ttsQueue.push({ text, audioUrl, visualType, speechText: finalSpeechText });
    console.log(`[TTS] [DEBUG] Item added to queue. Current Queue Depth: ${ttsQueue.length}`);

    // 현재 재생 중이 아니라면 큐 처리 시작
    if (!isTtsPlaying) {
        console.log(`[TTS] [DEBUG] No audio currently playing. Starting queue processor.`);
        processTtsQueue();
    } else {
        console.log(`[TTS] [DEBUG] Audio is already playing. Queueing request.`);
    }
}

async function processTtsQueue() {
    if (ttsQueue.length === 0) {
        console.log(`[TTS] [DEBUG] Queue is empty. Sequence finished.`);
        isTtsPlaying = false;
        return;
    }

    isTtsPlaying = true;
    const { text, audioUrl, visualType, speechText } = ttsQueue.shift();
    console.log(`[TTS] [ACTION] Processing next queue item. Text for bubble: ${text.substring(0, 30)}...`);

    // 말풍선 표시 로직 (v2.0 Terminal Shadow DOM 대응)
    const hud = window.AEGIS_HUD;
    if (hud) {
        const icon = window.TTS_ICONS[visualType] || '🤖';
        hud.showBubble(stripMarkdown(text), icon);

        hud.speechBubble.onclick = () => {
            hud.hideBubble();
            currentAudio.pause();
            currentAudio.src = '';
            if (window.stopVisualizer) window.stopVisualizer();
            window.dispatchAvatarEvent('TTS_STOP');
            clearTimeout(bubbleTimer);
            isTtsPlaying = false;
            // Immediate next queue item if requested
            processTtsQueue();
        };

        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(() => {
            hud.hideBubble();
        }, 120000);
    }

    // 오디오 재생 로직
    const playAudio = (url) => {
        currentAudio.src = url;
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
            if (window.AEGIS_HUD) window.AEGIS_HUD.hideBubble();
        }, 2000);

        // 약간의 간격을 두고 다음 큐 처리
        isTtsPlaying = false;
        setTimeout(() => processTtsQueue(), 500);
    };

    if (audioUrl) {
        playAudio(audioUrl);
    } else {
        try {
            const provider = window.AEGIS_SPEAKER_PROVIDER;
            const response = await fetch(`/api/plugins/${provider}/speak`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: speechText })
            });
            const data = await response.json();
            if (data.status === 'success' && data.url) {
                playAudio(data.url);
            } else {
                finishTts();
            }
        } catch (e) {
            console.error("TTS Error:", e);
            finishTts();
        }
    }
}

// [Core Service] 전역 함수 노출
window.speakTTS = speakTTS;
window.applyBriefingConfig = applyBriefingConfig;

