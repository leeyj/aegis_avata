/**
 * AEGIS Terminal Command Router (v1.6.8)
 * Centralized command dispatching logic.
 */

window.CommandRouter = {
    handlers: [], // [{ prefix: string, callback: function }]

    /**
     * 플러그인 또는 시스템 모듈이 전용 커맨드를 등록합니다.
     */
    register: function (prefix, callback) {
        this.handlers.push({ prefix, callback });
        console.log(`[CommandRouter] New command registered: ${prefix}`);
    },

    /**
     * 입력을 분석하여 적절한 핸들러로 라우팅합니다.
     */
    route: async function (command, selectedModel) {
        const lowerCmd = command.toLowerCase();

        // 1. 등록된 핸들러 탐색 (정교한 매칭)
        for (const h of this.handlers) {
            // 명령어가 접두사로 시작하고 다음에 공백이 있거나 전체가 일치하는 경우
            if (command.startsWith(h.prefix + ' ') || command === h.prefix) {
                return await h.callback(command, selectedModel);
            }
        }

        // 2. 고정 시스템 명령어 (모든 플러그인 공용)
        const sysActions = {
            '도움말': () => this.showHelp(),
            '/help': () => this.showHelp(),
            'clear': () => this.clearLogs()
        };

        if (sysActions[lowerCmd]) {
            return await sysActions[lowerCmd]();
        }

        // 3. 슬래시 명령어 방어 (핸들러 없는 슬래시)
        if (command.startsWith('/')) {
            window.TerminalUI.appendLog('SYSTEM', `알 수 없는 명령어: ${command}`);
            if (window.dispatchAvatarEvent) window.dispatchAvatarEvent('MOTION', { alias: 'neutral' });
            return;
        }

        // 4. 일반 AI 질의 (최종 폴백)
        if (window.processAIQuery) {
            return await window.processAIQuery(command, selectedModel);
        }
    },

    showHelp: function () {
        if (window.terminalConfig) {
            window.TerminalUI.appendLog('AUTO', window.terminalConfig.help_message);
        }
    },

    clearLogs: function () {
        const log = document.getElementById('terminal-log');
        if (log) log.innerHTML = '';
    }
};
