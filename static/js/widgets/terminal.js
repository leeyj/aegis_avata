/**
 * AEGIS Interactive Terminal - Core Engine (v1.6.8 Modularized)
 * Orchestrates UI and routes commands to CommandRouter.
 */

window.addEventListener('keydown', (e) => {
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

    window.terminalConfig = { help_message: "도움말 로드 중..." };

    const init = async () => {
        await refreshAIModels();
        await refreshTerminalConfig();
    };

    /** AI 모델 리스트 로드 */
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
        } catch (e) { console.error("[Terminal] Failed to load AI configs:", e); }
    }

    /** 터미널 설정 로드 */
    async function refreshTerminalConfig() {
        try {
            const res = await fetch('/api/plugins/terminal/config');
            const data = await res.json();
            if (data.status === 'success') window.terminalConfig = data.config;
        } catch (e) { console.error("[Terminal] Failed to load terminal config:", e); }
    }

    toggleBtn?.addEventListener('click', () => {
        window.TerminalUI.setTerminalState(terminalLog?.classList.contains('collapsed'));
    });

    input?.addEventListener('focus', () => window.TerminalUI.setTerminalState(true));

    /** 메인 키 프레스 핸들러 */
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
                // CommandRouter로 위임
                if (window.CommandRouter) {
                    await window.CommandRouter.route(command, selectedModel);
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

    /** 전역 AI 질의 처리 (Router에서 호출) */
    window.processAIQuery = async function (command, selectedModel) {
        window.TerminalUI.appendLog('SYSTEM', `${selectedModel.toUpperCase()} 엔진에 질의 중...`, true);
        try {
            let res;
            if (selectedModel === 'gemini') {
                res = await fetch('/api/plugins/proactive-agent/command', {
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

            // 데이터 정규화 및 로그 출력
            const answer = data.answer || data.briefing || data.response || data.message || "응답 형식이 올바르지 않습니다.";
            window.TerminalUI.appendLog(selectedModel.toUpperCase(), answer);

            if (window.reactionEngine && selectedModel === 'gemini') {
                window.reactionEngine.checkAndTrigger('terminal', data, 0);
            }
            executeTerminalAction(data.action, data.target);
        } catch (err) {
            window.TerminalUI.appendLog('ERROR', `AI 엔진 응답 처리 중 오류: ${err.message}`);
        }
    };

    init();
});

/** 명령어 결과에 따른 시스템 액션 실행 */
function executeTerminalAction(action, target) {
    if (!action || action === 'none') return;
    switch (action) {
        case 'toggle':
            if (window.togglePanel) {
                const panel = document.getElementById(target);
                if (panel) window.togglePanel(target, panel.style.display === 'none');
            }
            break;
        case 'navigate': window.location.href = target; break;
        case 'search': window.open(`https://www.google.com/search?q=${encodeURIComponent(target)}`, '_blank'); break;
    }
}

/** 외부 AI API 키 조회 */
async function getExternalKey(source) {
    const secrets = { "ollama": "aegis_ollama_key_2026", "grok": "aegis_grok_key_2026", "chatgpt": "aegis_chatgpt_key_2026" };
    return secrets[source] || "";
}
