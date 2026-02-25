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

    input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const command = input.value.trim();
            if (!command) return;

            input.value = '';
            input.placeholder = 'Processing command...';
            input.disabled = true;

            try {
                const res = await fetch('/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: command })
                });
                const data = await res.json();

                // 1. AI 응답 출력 (ReactionEngine 적용)
                if (window.reactionEngine) {
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
