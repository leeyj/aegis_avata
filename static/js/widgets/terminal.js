/**
 * AEGIS Interactive Terminal
 * Processes commands through Gemini and executes system actions
 */

window.addEventListener('keydown', (e) => {
    // '/' 키를 누르면 터미널로 포커스 (편의 기능)
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('terminal-input').focus();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('terminal-input');
    const modelSelector = document.getElementById('ai-model-selector');
    const terminalLog = document.getElementById('terminal-log');
    const toggleBtn = document.getElementById('terminal-toggle-btn');

    let autoCollapseTimer = null;

    /**
     * 터미널 확장/공간 제어
     */
    function setTerminalState(isExpanded) {
        if (!terminalLog) return;
        if (isExpanded) {
            terminalLog.classList.remove('collapsed');
            toggleBtn?.classList.add('active');
            resetAutoCollapse();
        } else {
            terminalLog.classList.add('collapsed');
            toggleBtn?.classList.remove('active');
        }
    }

    function resetAutoCollapse() {
        clearTimeout(autoCollapseTimer);
        autoCollapseTimer = setTimeout(() => {
            setTerminalState(false);
        }, 10000); // 10초
    }

    // 토글 버튼 클릭 이벤트
    toggleBtn?.addEventListener('click', () => {
        const isCollapsed = terminalLog.classList.contains('collapsed');
        setTerminalState(isCollapsed);
    });

    // 입력창 포커스 시 확장
    input?.addEventListener('focus', () => setTerminalState(true));

    /**
     * 터미널 로그 영역에 메시지 출력
     */
    function appendLog(source, message, isDebug = false) {
        if (!terminalLog) return;

        // 새 로그 발생 시 확장
        setTerminalState(true);

        const entry = document.createElement('div');
        entry.className = 'log-entry';

        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        let formattedMessage = typeof message === 'object' ? JSON.stringify(message) : message;
        if (!isDebug && window.marked) {
            formattedMessage = marked.parse(formattedMessage);
        }

        entry.innerHTML = `
            <span class="log-time">[${timeStr}]</span>
            <span class="log-source" style="color: ${source === 'SYSTEM' ? '#ffdf00' : 'var(--neon)'}">${source}</span>
            <span class="log-message ${isDebug ? 'log-debug' : ''}">${formattedMessage}</span>
        `;

        terminalLog.appendChild(entry);
        terminalLog.scrollTop = terminalLog.scrollHeight;

        // 로그 개수 제한 (메모리)
        if (terminalLog.childNodes.length > 50) {
            terminalLog.removeChild(terminalLog.firstChild);
        }
    }

    // AI 모델 리스트 로드 및 드롭다운 초기화
    async function refreshAIModels() {
        try {
            const res = await fetch('/api/v1/external/config');
            if (res.ok) {
                const response = await res.json();
                const sources = response.config?.sources || {};

                // 기존 옵션 유지 (Gemini) 하고 외부 모델 추가
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

    refreshAIModels();

    input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const command = input.value.trim();
            if (!command) return;

            input.value = '';
            input.placeholder = 'Processing command...';
            input.disabled = true;

            const selectedModel = modelSelector.value;
            appendLog('USER', command);
            appendLog('SYSTEM', `${selectedModel.toUpperCase()} 엔진에 질의를 전송합니다...`, true);

            try {
                const selectedModel = modelSelector.value;
                let res;

                if (selectedModel === 'gemini') {
                    // 기존 시스템(Gemini) 질의
                    res = await fetch('/command', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ command: command })
                    });
                } else {
                    // 외부 AI (Ollama, OpenClaw 등) 질의
                    // v1 API 규격에 맞춰 헤더에 키 포함 (임시로 secrets에서 가져오는 대신 API 설계대로 처리)
                    // 실제로는 서버쪽 세션이나 별도 인증이 필요할 수 있으나, 현재 구현된 /query 엔드포인트 활용
                    res = await fetch('/api/v1/external/query', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-AEGIS-API-KEY': await getExternalKey(selectedModel) // 키를 가져오는 헬퍼 필요
                        },
                        body: JSON.stringify({ prompt: command })
                    });
                }


                const data = await res.json();

                // 데이터 매핑: 외부 AI의 'answer'를 시스템 표준인 'response'로 복사
                if (data.answer && !data.response) {
                    data.response = data.answer;
                }
                if (!data.sentiment) data.sentiment = 'neutral';

                appendLog(selectedModel.toUpperCase(), data.answer || data.briefing || data.response || data.message || "Unknown response format");
                // appendLog('DEBUG', data, true); // 연동 확인 완료 - 필요 시 주석 해제하여 확인

                // 1. AI 응답 출력 (ReactionEngine 적용)
                // 중요: 외부 AI(/query)는 서버에서 이미 이벤트를 큐에 넣고 ExternalAPIManager가 폴링하여 처리하므로,
                // 여기서는 Gemini(System) 응답만 리액션 엔진에 전달하여 중복 재생을 방지합니다.
                if (window.reactionEngine && selectedModel === 'gemini') {
                    window.reactionEngine.checkAndTrigger('terminal', data, 0);
                }

                // 2. 명령어 액션 실행
                executeTerminalAction(data.action, data.target);

            } catch (err) {
                console.error("[Terminal] Command Error:", err);
            } finally {
                input.placeholder = '명령을 입력하세요...';
                input.disabled = false;
                input.focus();
            }
        }
    });
});

function executeTerminalAction(action, target) {
    if (!action || action === 'none') return;

    // console.log(`[Terminal Action] Executing: ${action} on ${target}`);

    switch (action) {
        case 'toggle':
            // 위젯 토글 (p-weather 등)
            if (window.togglePanel) {
                const panel = document.getElementById(target);
                if (panel) {
                    const isVisible = panel.style.display !== 'none';
                    window.togglePanel(target, !isVisible);
                }
            }
            break;
        case 'navigate':
            // 페이지 이동
            window.location.href = target;
            break;
        case 'search':
            // 외부 검색 (새 창)
            window.open(`https://www.google.com/search?q=${encodeURIComponent(target)}`, '_blank');
            break;
    }
}

/**
 * 선택된 모델에 적합한 외부 API 키를 조회합니다.
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
