/**
 * AEGIS Notion Intelligence Widget
 * Fetches and displays recent activities from Notion.
 */

// 전역 설정 객체 (기본값)
window.notionConfig = {
    widget_display_limit: 10,
    polling_interval_ms: 300000
};

document.addEventListener('DOMContentLoaded', async () => {
    // 0. 설정 로드
    try {
        const configRes = await fetch('/api/notion/config');
        const configData = await configRes.json();
        if (configData.success) {
            window.notionConfig = configData.config;
        }
    } catch (e) {
        console.warn("[Notion Widget] Using default config:", e);
    }

    // 1. 초기 로드
    refreshNotionWidget();

    // 2. 주기에 따라 자동 갱신
    setInterval(refreshNotionWidget, window.notionConfig.polling_interval_ms || 300000);
});

/**
 * 노션 위젯 데이터를 서버에서 가져와 렌더링합니다.
 */
async function refreshNotionWidget() {
    const listContainer = document.getElementById('notion-list');
    if (!listContainer) return;

    try {
        const limit = window.notionConfig.widget_display_limit || 10;
        const response = await fetch(`/api/notion/recent?limit=${limit}`);
        const data = await response.json();

        if (data.success && data.items) {
            renderNotionList(data.items);
        } else {
            listContainer.innerHTML = '<div class="loading-text">데이터를 불러오지 못했습니다.</div>';
        }
    } catch (error) {
        console.error("[Notion Widget] Fetch error:", error);
        listContainer.innerHTML = '<div class="loading-text">서버 연결 오류</div>';
    }
}

/**
 * 수신된 데이터를 HTML 리스트로 렌더링
 */
function renderNotionList(items) {
    const listContainer = document.getElementById('notion-list');
    if (!items || items.length === 0) {
        listContainer.innerHTML = '<div class="loading-text">비어 있음</div>';
        return;
    }

    listContainer.innerHTML = items.map(item => {
        const date = new Date(item.created_time);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

        return `
            <div class="notion-item" onclick="window.open('https://www.notion.so/${item.id.replace(/-/g, '')}', '_blank')">
                <span class="notion-item-title">${item.title}</span>
                <span class="notion-item-time">${dateStr}</span>
            </div>
        `;
    }).join('');
}

/**
 * AI 지식 브리핑 트리거 (선택된 엔진 동적 연동)
 */
async function triggerNotionBriefing() {
    if (window.logger) window.logger.info("[Notion] Triggering AI briefing...");

    // 1. 현재 터미널에서 선택된 모델 가져오기
    const modelSelector = document.getElementById('ai-model-selector');
    const selectedModel = modelSelector ? modelSelector.value : 'gemini';

    // UI 피드백
    if (typeof window.speakTTS === 'function') {
        window.speakTTS("노션 지식 허브에서 최신 데이터를 분석 중입니다. 잠시만 기다려 주세요.", null, "SYSTEM");
    }

    try {
        // 2. 서버에 브리핑 요청 (현재 모델 정보 포함)
        const response = await fetch(`/api/notion/brief?model=${selectedModel}`);
        const data = await response.json();

        if (data.success) {
            // 3. 터미널 로그에 결과 출력 (DISPLAY 영역)
            if (typeof window.appendLog === 'function') {
                window.appendLog(`NOTION (${selectedModel.toUpperCase()})`, data.display);
            }

            // 4. 아바타 음성 출력 (VOICE 영역)
            if (typeof window.speakTTS === 'function' && data.voice) {
                window.speakTTS(data.voice, null, `NOTION_${selectedModel.toUpperCase()}`);
            }

            // 5. 아바타 리액션 (감정 상태 연동)
            if (window.reactionEngine && data.sentiment) {
                window.reactionEngine.checkAndTrigger('briefing', { sentiment: data.sentiment }, 0);
            }
        } else {
            if (window.logger) window.logger.error("[Notion Briefing] Failed:", data.message);
        }
    } catch (error) {
        console.error("[Notion Briefing] Error:", error);
    }
}

// 전역 노출
window.refreshNotionWidget = refreshNotionWidget;
window.triggerNotionBriefing = triggerNotionBriefing;
