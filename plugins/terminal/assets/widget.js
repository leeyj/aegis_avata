/**
 * AEGIS v2.2.5 [DNA Synergy] 
 * Quake HUD Style Terminal Core
 * Redesigned for full-screen floating experience.
 */

export default {
    init: async function (shadowRoot, context) {
        context.log("DNA Syndicate Terminal (HUD Mode) initializing...");

        // UI Elements
        const input = shadowRoot.getElementById('terminal-input');
        const modelSelector = shadowRoot.getElementById('ai-model-selector');
        const terminalLog = shadowRoot.getElementById('terminal-log');
        const terminalContainer = shadowRoot.getElementById('terminal-container');
        const resizer = shadowRoot.getElementById('terminal-resizer');
        const statusNode = shadowRoot.querySelector('.status-node');

        // Drag Resize State
        let isResizing = false;

        // Command History State
        let commandHistory = [];
        let historyIndex = -1;

        // Config State
        this.config = { max_log_lines: 300, height_vh: 50 };

        const loadConfig = async () => {
            try {
                const res = await fetch('/api/plugins/terminal/config');
                const data = await res.json();
                if (data.status === 'success') {
                    Object.assign(this.config, data.config);
                    applyTerminalHeight(this.config.height_vh);
                }
            } catch (e) { context.log("Failed to load terminal config."); }
        };

        const applyTerminalHeight = (vh) => {
            terminalContainer.style.height = `${vh}vh`;
            // 로그 영역의 높이도 자동으로 조정되도록 flex: 1 설정 확인됨
        };

        const saveConfig = async () => {
            try {
                await fetch('/api/plugins/terminal/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.config)
                });
            } catch (e) { context.log("Failed to save terminal config."); }
        };

        // --- Terminal State Control (HUD Style) ---
        const setTerminalState = (isExpanded) => {
            if (isExpanded) {
                terminalContainer.classList.remove('collapsed');
                input.focus();
                statusNode.textContent = "ACTIVE";
                statusNode.style.color = "#000";
            } else {
                terminalContainer.classList.add('collapsed');
                input.blur();
                statusNode.textContent = "READY";
            }
        };

        const toggleTerminal = () => {
            const isHidden = terminalContainer.classList.contains('collapsed');
            setTerminalState(isHidden);
        };



        // --- Drag Resize Logic ---
        resizer.onmousedown = (e) => {
            isResizing = true;
            terminalContainer.style.transition = 'none'; // 드래그 중에는 애니메이션 끔
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        };

        window.onmousemove = (e) => {
            if (!isResizing) return;
            const newHeightVh = (e.clientY / window.innerHeight) * 100;
            if (newHeightVh > 10 && newHeightVh < 95) {
                this.config.height_vh = Math.round(newHeightVh);
                applyTerminalHeight(this.config.height_vh);
            }
        };

        window.onmouseup = () => {
            if (isResizing) {
                isResizing = false;
                terminalContainer.style.transition = ''; // 애니메이션 복구
                document.body.style.cursor = '';
                saveConfig(); // 마우스를 뗐을 때 딱 한 번만 저장 (IO 부하 방지)
            }
        };
        const appendLog = (source, message, isDebug = false) => {
            // HUD 모드에서는 로그가 출력될 때 창을 자동으로 연다 (선택 사항)
            // if (terminalContainer.classList.contains('collapsed')) setTerminalState(true);

            // Smart Scroll Detection
            const isAtBottom = terminalLog.scrollHeight - terminalLog.clientHeight <= terminalLog.scrollTop + 50;

            const entry = document.createElement('div');
            entry.className = 'log-entry';
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

            let formattedMessage = message;
            if (typeof marked !== 'undefined' && !isDebug) {
                formattedMessage = marked.parse(message);
            } else if (!isDebug) {
                formattedMessage = message.replace(/\n/g, '<br/>');
            }

            entry.innerHTML = `
                <span class="log-time">[${timeStr}]</span>
                <span class="log-source" style="color: ${source === 'SYSTEM' ? '#ffdf00' : '#00f2ff'}">${source}</span>
                <span class="log-message">${formattedMessage}</span>
            `;
            terminalLog.appendChild(entry);

            if (isAtBottom) {
                terminalLog.scrollTop = terminalLog.scrollHeight;
            }

            if (terminalLog.childNodes.length > (this.config.max_log_lines || 100))
                terminalLog.removeChild(terminalLog.firstChild);
        };

        const clearLog = () => {
            if (terminalLog) terminalLog.innerHTML = '';
        };

        // Expose globally
        window.appendLog = appendLog;
        window.TerminalUI = { appendLog, clearLog, toggle: toggleTerminal };

        // --- Shortcuts & Global Integration ---
        this._handleKeyDown = (e) => {
            // [v2.2.8] HUD Toggle: Shift + ~ (Quake style) OR Esc(to close)
            const isInputActive = (document.activeElement.tagName === 'INPUT' || shadowRoot.activeElement === input);

            if (e.shiftKey && (e.key === '~' || e.key === '`' || e.code === 'Backquote') && !isInputActive) {
                e.preventDefault();
                toggleTerminal();
            } else if (e.key === 'Escape' && !terminalContainer.classList.contains('collapsed')) {
                setTerminalState(false);
            }
        };
        window.addEventListener('keydown', this._handleKeyDown);

        // --- Input Logic & History ---
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                const cmd = input.value.trim();
                input.value = '';

                if (commandHistory[commandHistory.length - 1] !== cmd) {
                    commandHistory.push(cmd);
                }
                historyIndex = -1;

                appendLog('USER', cmd);
                await window.CommandRouter.route(cmd, modelSelector.value);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (commandHistory.length > 0) {
                    if (historyIndex === -1) historyIndex = commandHistory.length - 1;
                    else if (historyIndex > 0) historyIndex--;
                    input.value = commandHistory[historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex !== -1) {
                    if (historyIndex < commandHistory.length - 1) {
                        historyIndex++;
                        input.value = commandHistory[historyIndex];
                    } else {
                        historyIndex = -1;
                        input.value = '';
                    }
                }
            }
        });

        // AI Model Sync
        modelSelector.addEventListener('change', () => {
            window.AEGIS_AI_MODEL = modelSelector.value;
            context.log(`Global AI Model switched to: ${window.AEGIS_AI_MODEL}`);
        });

        // Initial Load of AI Models (Proxy via AI Gateway logic)
        const loadModels = async () => {
            try {
                const res = await fetch('/api/v1/external/config');
                const data = await res.json();
                const sources = data.config?.sources || {};
                modelSelector.innerHTML = '<option value="gemini">AEGIS (System)</option>';
                for (const [id, s] of Object.entries(sources)) {
                    if (s.active) {
                        const opt = document.createElement('option');
                        opt.value = id; opt.textContent = s.name || id.toUpperCase();
                        modelSelector.appendChild(opt);
                    }
                }
            } catch (e) { context.log("Failed to load AI models."); }
        };

        // 명령어 등록 (터미널 설정 제어)
        context.registerCommand('/term', async (cmd) => {
            const parts = cmd.split(' ');
            const action = parts[1]; // lines, height
            const value = parseInt(parts[2]);

            if (action === 'lines' && !isNaN(value)) {
                this.config.max_log_lines = value;
                context.appendLog('SYSTEM', `✅ 터미널 로그 제한이 ${value}라인으로 변경되었습니다.`);
                await saveConfig();
            } else if (action === 'height' && !isNaN(value)) {
                this.config.height_vh = value;
                applyTerminalHeight(value);
                context.appendLog('SYSTEM', `✅ 터미널 높이가 ${value}vh로 변경되었습니다.`);
                await saveConfig();
            } else {
                context.appendLog('SYSTEM', '사용법: /term [lines | height] [값] (예: /term height 70)');
            }
        });

        await loadConfig();
        await loadModels();
        window.AEGIS_AI_MODEL = modelSelector.value;

        context.log("Quake HUD Terminal Ready. [Esc/`]");
    },

    /**
     * [v2.4] Resource cleanup (Plugin-X Rule 5-3)
     */
    destroy: function () {
        if (this._handleKeyDown) {
            window.removeEventListener('keydown', this._handleKeyDown);
        }
        window.appendLog = null;
        window.TerminalUI = null;
    }
};
