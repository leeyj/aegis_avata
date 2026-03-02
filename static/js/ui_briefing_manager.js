/**
 * AEGIS UI - Briefing & Sentiment Service (v1.8.5)
 * Standardized AI Tactical Briefing & TTS hooks.
 */

window.BriefingService = {
    /**
     * 특정 소스(플러그인, 위젯 버튼 등)로부터 브리핑을 실행합니다.
     * @param {string} sourceId 플러그인 ID 또는 브리핑 타입
     * @param {HTMLElement} feedbackEl 로딩 상태를 표시할 UI 요소
     * @param {object} options { text: "직접 출력할 텍스트", sentiment: "감정" }
     */
    async trigger(sourceId = 'tactical', feedbackEl = null, options = {}) {
        const briefingType = (sourceId === 'title' || !sourceId) ? 'tactical' : sourceId;
        console.log(`[BriefingService] [ACTION] Triggering ${briefingType} briefing... Source: ${sourceId}`);

        // 1. 직접 텍스트 출력 모드 (서버 분석 생략)
        if (options.text) {
            console.log(`[BriefingService] [DEBUG] Direct text mode: "${options.text.substring(0, 30)}..."`);
            if (window.applyAvatarSentiment) window.applyAvatarSentiment(options.sentiment || 'happy');
            if (typeof window.speakTTS === 'function') {
                window.speakTTS(options.text, null, briefingType);
            }
            return { status: 'success' };
        }

        // 2. AI 데이터 분석 모드 (서버 호출)
        const originalText = feedbackEl ? feedbackEl.innerText : null;
        if (feedbackEl) {
            console.log(`[BriefingService] [DEBUG] Applying visual feedback to element.`);
            feedbackEl.innerText = "ANALYZING DATA...";
            feedbackEl.style.opacity = "0.5";
            feedbackEl.classList.add('loading-pulse');
        }

        try {
            const endpoint = briefingType === 'tactical'
                ? '/api/plugins/proactive-agent/briefing/tactical'
                : `/api/plugins/proactive-agent/briefing/widget/${briefingType}`;

            console.log(`[BriefingService] [NETWORK] Fetching from ${endpoint}...`);
            const res = await fetch(endpoint);
            const data = await res.json();
            console.log(`[BriefingService] [DEBUG] Data received from server:`, data);

            if (data.briefing) {
                console.log(`[BriefingService] [DEBUG] AI Briefing found (${data.briefing.length} chars). Applying sentiment ${data.sentiment}.`);
                if (window.applyAvatarSentiment) window.applyAvatarSentiment(data.sentiment);

                // [Sound Logic] 음성 출력 시도
                if (typeof window.speakTTS === 'function') {
                    console.log(`[BriefingService] [ACTION] Passing to speakTTS: "${data.briefing.substring(0, 50)}..."`);
                    window.speakTTS(data.briefing, data.audio_url, data.visual_type || briefingType);
                } else {
                    console.error("[BriefingService] [ERROR] window.speakTTS is not defined! Audio failed.");
                }
                return { status: 'success', data };
            } else {
                console.warn("[BriefingService] [WARN] Response received but briefing field is missing/empty.");
            }
        } catch (e) {
            console.error(`[BriefingService] Briefing failed (${briefingType}):`, e);
            return { status: 'error', error: e.message };
        } finally {
            if (feedbackEl) {
                feedbackEl.innerText = originalText;
                feedbackEl.style.opacity = "1";
                feedbackEl.classList.remove('loading-pulse');
            }
        }
    }
};

window.applyAvatarSentiment = function (sentiment) {
    if (typeof window.dispatchAvatarEvent !== 'function') return;
    const motions = {
        'happy': { m: "Joy.motion3.json", e: "Smile.exp3.json" },
        'serious': { m: "SignShock.motion3.json", e: "Sorrow.exp3.json" },
        'alert': { m: "Shock.motion3.json", e: "SignShock.exp3.json" }
    };
    const action = motions[sentiment] || { m: "TapBody.motion3.json", e: null };
    window.dispatchAvatarEvent('MOTION', { file: action.m });
    if (action.e) window.dispatchAvatarEvent('EMOTION', { file: action.e });
};
