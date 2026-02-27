/**
 * AEGIS Interactive Terminal - Main Entry Point
 * Orchestrates commands and coordinates between UI and specialized handlers.
 */

window.addEventListener('keydown', (e) => {
    // '/' 키를 누르면 터미널로 포커스
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        const input = document.getElementById('terminal-input');
        if (input) input.focus();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('terminal-input');
    const modelSelector = document.getElementById('ai-model-selector');
    const terminalLog = document.getElementById('terminal-log');
    const toggleBtn = document.getElementById('terminal-toggle-btn');

    if (!input || !modelSelector) return;

    // 터미널 설정 로드
    let terminalConfig = { help_message: "도움말 로드 중..." };

    const init = async () => {
        await refreshAIModels();
        await refreshTerminalConfig();
    };

    /**
     * AI 모델 리스트 로드 및 드롭다운 초기화
     */
    async function refreshAIModels() {
        try {
            const res = await fetch('/api/v1/external/config');
            if (res.ok) {
                const response = await res.json();
                const sources = response.config?.sources || {};
                modelSelector.innerHTML = '<option value="gemini">AEGIS (System)</option>';

                for (const [id, source] of Object.entries(sources)) {
                    if (source.active) {
                        const opt = document.createElement('option');
                        opt.value = id;
                        opt.textContent = source.name || id.toUpperCase();
                        modelSelector.appendChild(opt);
                    }
                }
            }
        } catch (e) {
            console.error("[Terminal] Failed to load AI configs:", e);
        }
    }

    /**
     * 터미널 설정(도움말 등) 로드
     */
    async function refreshTerminalConfig() {
        try {
            const res = await fetch('/api/terminal/config');
            const data = await res.json();
            if (data.status === 'success') {
                terminalConfig = data.config;
            }
        } catch (e) {
            console.error("[Terminal] Failed to load terminal config:", e);
        }
    }

    // UI 이벤트 리스너 연결
    toggleBtn?.addEventListener('click', () => {
        const isCollapsed = terminalLog?.classList.contains('collapsed');
        window.TerminalUI.setTerminalState(isCollapsed);
    });

    input?.addEventListener('focus', () => window.TerminalUI.setTerminalState(true));

    // 메인 명령어 처리
    input?.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const command = input.value.trim();
            if (!command) return;

            input.value = '';
            input.placeholder = 'Processing...';
            input.disabled = true;

            const selectedModel = modelSelector.value;
            window.TerminalUI.appendLog('USER', command);

            try {
                // 1. 시스템 명령어 라우팅 (접두사 정규식 또는 유연한 매칭)
                const lowerCmd = command.toLowerCase();

                if (lowerCmd === '/도움말' || lowerCmd === '/help' || lowerCmd === '/?') {
                    window.TerminalUI.appendLog('HELP', terminalConfig.help_message);
                }
                else if (lowerCmd.startsWith('/n ') || lowerCmd.startsWith('/todo ')) {
                    await window.NotionHandler.handleAdd(command);
                }
                else if (lowerCmd.startsWith('/ns') || lowerCmd.startsWith('/search')) {
                    // /ns 일정 또는 /ns일정 모두 대응 가능하도록 처리
                    const queryPart = command.includes(' ') ? command.substring(command.indexOf(' ') + 1) : command.substring(3);
                    if (queryPart.trim()) {
                        await window.NotionHandler.handleSearch(`/ns ${queryPart.trim()}`);
                    } else {
                        window.TerminalUI.appendLog('ERROR', '검색어를 입력해 주세요. (예: /ns 일정)');
                    }
                }
                // [ADD] 노션 정리 확정 명령어 처리 (슬래시 없이 입력하는 경우 대응)
                else if (lowerCmd === '정리 실행' || lowerCmd === 'apply clean' || lowerCmd === '정리실행') {
                    await window.NotionHandler.handleApplyCleanup();
                }
                // 2. 알 수 없는 슬래시 명령어 처리 (AI 전송 차단 및 로컬 안내)
                else if (command.startsWith('/')) {
                    const cleanCommand = command.substring(1).trim();
                    window.TerminalUI.appendLog('ERROR', `❌ 알 수 없는 명령어: "/${cleanCommand}" (/? 를 입력하여 도움말을 확인하세요)`);

                    // 미리 생성된 시스템 음성 재생
                    if (typeof window.speakTTS === 'function') {
                        // speakTTS는 텍스트를 받으므로, 오디오를 직접 재생하거나 전용 함수 활용
                        // 시스템 알림용 임시 오디오 객체 생성
                        const audio = new Audio('/static/audio/system/wrong_command.mp3');
                        audio.play().catch(e => console.error("Audio play failed:", e));

                        // 말풍선만 표시
                        window.speakTTS(`명령어 "/${cleanCommand}"를 찾을 수 없습니다.`, null, 'error', true); // 네 번째 인자로 음성 생략 옵션이 있다면 활용
                    }

                    if (typeof window.dispatchAvatarEvent === 'function') {
                        window.dispatchAvatarEvent('MOTION', { alias: 'neutral' });
                    }
                }
                // 3. 일반 AI 질의 처리
                else {
                    await processAIQuery(command, selectedModel);
                }
            } catch (err) {
                console.error("[Terminal] Error:", err);
                window.TerminalUI.appendLog('ERROR', `작동 중 오류 발생: ${err.message}`);
            } finally {
                input.placeholder = '명령을 입력하세요...';
                input.disabled = false;
                input.focus();
            }
        }
    });

    /**
     * AI 엔진 질의 처리 및 아바타 연동
     */
    async function processAIQuery(command, selectedModel) {
        window.TerminalUI.appendLog('SYSTEM', `${selectedModel.toUpperCase()} 엔진에 질의 중...`, true);

        let res;
        try {
            if (selectedModel === 'gemini') {
                res = await fetch('/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: command })
                });
            } else {
                res = await fetch('/api/v1/external/query', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-AEGIS-API-KEY': await getExternalKey(selectedModel)
                    },
                    body: JSON.stringify({ prompt: command })
                });
            }

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();

            // 데이터 정규화
            if (data.answer && !data.response) data.response = data.answer;
            if (!data.sentiment) data.sentiment = 'neutral';

            window.TerminalUI.appendLog(selectedModel.toUpperCase(), data.answer || data.briefing || data.response || data.message || "응답 형식이 올바르지 않습니다.");

            // 아바타 리액션 및 액션 실행
            if (window.reactionEngine && selectedModel === 'gemini') {
                window.reactionEngine.checkAndTrigger('terminal', data, 0);
            }
            executeTerminalAction(data.action, data.target);
        } catch (err) {
            window.TerminalUI.appendLog('ERROR', `AI 엔진 응답 처리 중 오류: ${err.message}`);
        }
    }

    init();
});

/**
 * 명령어 결과에 따른 시스템 액션 실행
 */
function executeTerminalAction(action, target) {
    if (!action || action === 'none') return;

    switch (action) {
        case 'toggle':
            if (window.togglePanel) {
                const panel = document.getElementById(target);
                if (panel) {
                    const isVisible = panel.style.display !== 'none';
                    window.togglePanel(target, !isVisible);
                }
            }
            break;
        case 'navigate':
            window.location.href = target;
            break;
        case 'search':
            window.open(`https://www.google.com/search?q=${encodeURIComponent(target)}`, '_blank');
            break;
    }
}

/**
 * 외부 AI API 키 조회
 */
async function getExternalKey(source) {
    const secrets = {
        "ollama": "aegis_ollama_key_2026",
        "openclaw": "aegis_openclaw_key_2026",
        "chatgpt": "aegis_chatgpt_key_2026",
        "grok": "aegis_grok_key_2026"
    };
    return secrets[source] || "";
}
