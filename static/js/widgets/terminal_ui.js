/**
 * AEGIS Terminal UI Module
 * Handles logging, UI states, and auto-collapse.
 */
window.TerminalUI = {
    autoCollapseTimer: null,

    /**
     * 터미널 확장/공간 제어
     */
    setTerminalState(isExpanded) {
        const terminalLog = document.getElementById('terminal-log');
        const toggleBtn = document.getElementById('terminal-toggle-btn');
        if (!terminalLog) return;

        if (isExpanded) {
            terminalLog.classList.remove('collapsed');
            toggleBtn?.classList.add('active');
            this.resetAutoCollapse();
        } else {
            terminalLog.classList.add('collapsed');
            toggleBtn?.classList.remove('active');
        }
    },

    resetAutoCollapse() {
        clearTimeout(this.autoCollapseTimer);
        this.autoCollapseTimer = setTimeout(() => {
            this.setTerminalState(false);
        }, 10000); // 10초
    },

    /**
     * 터미널 로그 영역에 메시지 출력
     */
    appendLog(source, message, isDebug = false) {
        const terminalLog = document.getElementById('terminal-log');
        if (!terminalLog) return;

        // 새 로그 발생 시 확장
        this.setTerminalState(true);

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
};
