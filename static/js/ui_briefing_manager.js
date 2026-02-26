/**
 * AEGIS UI - Briefing & Sentiment Manager
 * Handles AI Tactical Briefing triggers and Avatar emotional reactions.
 */

/**
 * 메인 타이틀 클릭 시 실행되는 전술 브리핑 트리거
 */
function initBriefingTrigger() {
    const titlePanel = document.getElementById('p-title');
    if (!titlePanel) return;

    titlePanel.style.cursor = 'pointer';
    titlePanel.onclick = async () => {
        const titleEl = document.getElementById('main-title');
        const originalText = titleEl.innerText;
        try {
            titleEl.innerText = "ANALYZING DATA...";
            titleEl.style.opacity = "0.5";
            const res = await fetch('/tactical_briefing');
            const data = await res.json();
            if (data.briefing) {
                applyAvatarSentiment(data.sentiment);
                if (typeof speakTTS === 'function') {
                    speakTTS(data.briefing, data.audio_url, data.visual_type);
                }
            }
        } catch (e) {
            console.error("[Briefing] Tactical briefing failed:", e);
        } finally {
            titleEl.innerText = originalText;
            titleEl.style.opacity = "1";
        }
    };
}

/**
 * 특정 위젯(뉴스, 금융 등)에 대한 AI 브리핑 실행
 * @param {string} type 'news', 'finance', 'calendar' 등
 */
async function triggerWidgetBriefing(type) {
    const btn = event?.currentTarget;
    if (btn) btn.classList.add('loading-pulse');
    try {
        const res = await fetch(`/widget_briefing/${type}`);
        const data = await res.json();
        if (data.briefing) {
            applyAvatarSentiment(data.sentiment);
            if (typeof speakTTS === 'function') {
                speakTTS(data.briefing, data.audio_url, type);
            }
        }
    } catch (e) {
        console.error(`[Briefing] Widget briefing failed (${type}):`, e);
    } finally {
        if (btn) btn.classList.remove('loading-pulse');
    }
}

/**
 * 감정에 따른 아바타 반응 맵핑 및 이벤트 전송
 * @param {string} sentiment 'happy', 'serious', 'alert' 등
 */
function applyAvatarSentiment(sentiment) {
    if (typeof window.dispatchAvatarEvent !== 'function') return;

    switch (sentiment) {
        case 'happy':
            window.dispatchAvatarEvent('MOTION', { file: "Joy.motion3.json" });
            window.dispatchAvatarEvent('EMOTION', { file: "Smile.exp3.json" });
            break;
        case 'serious':
            window.dispatchAvatarEvent('MOTION', { file: "SignShock.motion3.json" });
            window.dispatchAvatarEvent('EMOTION', { file: "Sorrow.exp3.json" });
            break;
        case 'alert':
            window.dispatchAvatarEvent('MOTION', { file: "Shock.motion3.json" });
            window.dispatchAvatarEvent('EMOTION', { file: "SignShock.exp3.json" });
            break;
        default:
            window.dispatchAvatarEvent('MOTION', { file: "TapBody.motion3.json" });
            break;
    }
}
