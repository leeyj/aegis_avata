/**
 * AEGIS Terminal Plugin - Standard V4 Refined (v4.1.0)
 * Optimized for standard widget layout with premium UI.
 */

export default {
    init: async function (root, context) {
        context.log("AEGIS Terminal initializing in standard mode...");

        // UI Elements
        const input = root.getElementById('terminal-input');
        const modelSelector = root.getElementById('ai-model-selector');
        const terminalLog = root.getElementById('terminal-log');
        const terminalContainer = root.getElementById('terminal-container');
        const statusNode = root.querySelector('.status-node');
        const statusIndicator = root.querySelector('.status-indicator');

        // Command History State
        let commandHistory = [];
        let historyIndex = -1;

        // Config State
        this.config = { max_log_lines: 300 };

        /**
         * Append logic for high-end terminal logs
         */
        const appendLog = (source, message) => {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            
            const sourceClass = source.toLowerCase() === 'user' ? 'source-user' : 
                              source.toLowerCase() === 'ai' ? 'source-ai' : 'source-system';
            
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            let parsedMessage = message;
            if (window.marked && (source.toUpperCase() === 'AI' || source.toUpperCase() === 'SYSTEM' || source.toUpperCase() === 'USER')) {
                // Parse markdown, specifically allowing breaks and handling standard tags
                parsedMessage = window.marked.parse(message, { breaks: true });
            }

            entry.innerHTML = `
                <div class="log-source ${sourceClass}">${source.toUpperCase()}</div>
                <div class="log-message markdown-body">${parsedMessage}</div>
                <div class="log-time">${timeStr}</div>
            `;

            terminalLog.appendChild(entry);
            
            // Limit log lines
            while (terminalLog.children.length > this.config.max_log_lines) {
                terminalLog.removeChild(terminalLog.firstChild);
            }

            // Auto-scroll
            terminalLog.scrollTop = terminalLog.scrollHeight;
        };

        // Bridge internal appendLog to context for external use
        window.appendLog = appendLog;

        const loadConfig = async () => {
            try {
                const res = await fetch('/api/plugins/terminal/config');
                const data = await res.json();
                if (data.status === 'success') {
                    Object.assign(this.config, data.config);
                }
            } catch (e) { context.log("Failed to load terminal config."); }
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

        const setTerminalState = (isVisible) => {
            if (isVisible) {
                setTimeout(() => input.focus(), 50);
                statusNode.textContent = "ACTIVE";
                statusIndicator.style.background = "#00f2ff";
                statusIndicator.style.boxShadow = "0 0 8px #00f2ff";
                context.messageBroker.send('core', 'SET_PASSTHROUGH', { isPassthrough: false });
            } else {
                input.blur();
                statusNode.textContent = "READY";
                statusIndicator.style.background = "rgba(0, 242, 255, 0.3)";
                statusIndicator.style.boxShadow = "none";
                context.messageBroker.send('core', 'SET_PASSTHROUGH', { isPassthrough: true });
            }
        };

        const toggleTerminal = async (forcedState = null) => {
            const { panelVisibility } = await context.getSystemState();
            const isCurrentlyVisible = panelVisibility['terminal'] === true;
            const targetVisible = forcedState !== null ? forcedState : !isCurrentlyVisible;
            
            setTerminalState(targetVisible);
            context.requestCore('WIDGET_VISIBILITY_CHANGED', { id: 'terminal', visible: targetVisible });
        };

        // --- Shortcuts ---
        this._handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                toggleTerminal(false);
            }
        };
        window.addEventListener('keydown', this._handleKeyDown);

        // --- Input Handling ---
        input.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                const cmd = input.value.trim();
                input.value = '';

                if (commandHistory[commandHistory.length - 1] !== cmd) {
                    commandHistory.push(cmd);
                }
                historyIndex = -1;

                appendLog('USER', cmd);
                // [v4.1] Wait for standardized command response
                try {
                    const res = await context.requestCore('ROUTE_CMD', { cmd: cmd, model: modelSelector.value });
                    if (res && res.text) {
                        appendLog('AI', res.text);
                    } else if (res && res.status === 'error') {
                        appendLog('SYSTEM', `Execution Error: ${res.message}`);
                    }
                } catch (err) {
                    appendLog('SYSTEM', `Network/Gateway Error: ${err.message}`);
                }
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

        context.messageBroker.on('TOGGLE_TERMINAL', (sender, cmd, data) => {
            toggleTerminal(data && data.force !== undefined ? data.force : null);
        });

        // AI Model Sync
        modelSelector.addEventListener('change', () => {
            // [v4.1.1] Use dedicated AI engine change call
            context.changeAiEngine(modelSelector.value);
            context.log(`Terminal AI Model selected: ${modelSelector.value}`);
        });

        const loadModels = async () => {
            try {
                const res = await fetch('/api/v1/external/config');
                const data = await res.json();
                const sources = data.config?.sources || {};
                modelSelector.innerHTML = '<option value="gemini">AEGIS CORE</option>';
                for (const [id, s] of Object.entries(sources)) {
                    if (s.active) {
                        const opt = document.createElement('option');
                        opt.value = id; opt.textContent = s.name || id.toUpperCase();
                        modelSelector.appendChild(opt);
                    }
                }
                
                // [v4.1.1] Sync current engine selection
                const { lastAiEngine } = await context.getSystemState();
                if (lastAiEngine) modelSelector.value = lastAiEngine;
                
            } catch (e) { context.log("Failed to load AI models."); }
        };

        context.registerCommand('/term', async (cmd) => {
            const parts = cmd.split(' ');
            const action = parts[1];
            const value = parseInt(parts[2]);

            if (action === 'lines' && !isNaN(value)) {
                this.config.max_log_lines = value;
                appendLog('SYSTEM', `✅ 터미널 로그 제한이 ${value}라인으로 변경되었습니다.`);
                await saveConfig();
            } else {
                appendLog('SYSTEM', '사용법: /term lines [값]');
            }
        });

        await loadConfig();
        await loadModels();
        window.AEGIS_AI_MODEL = modelSelector.value;

        // Bridge appendLog to host for other plugins
        window.Terminal = {
            appendLog: (tag, msg) => appendLog(tag, msg)
        };

        const { panelVisibility } = await context.getSystemState();
        setTerminalState(panelVisibility['terminal'] === true);

        context.log("Terminal Widget Ready.");
    },

    destroy: function () {
        if (this._handleKeyDown) {
            window.removeEventListener('keydown', this._handleKeyDown);
        }
        window.Terminal = null;
        window.appendLog = null;
    }
};
