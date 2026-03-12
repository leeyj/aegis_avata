/**
 * AEGIS Plugin-X Climate Control Widget (TinyTuya)
 */
export default {
    updateTimer: null,
    context: null,
    root: null,

    init: async function (root, context) {
        this.context = context;
        this.root = root;
        context.log("Climate Control initializing...");

        // 1. DOM 요소 바인딩
        const onBtn = root.getElementById('cc-on-btn');
        const offBtn = root.getElementById('cc-off-btn');

        if (onBtn) onBtn.onclick = () => this.sendControl(true);
        if (offBtn) offBtn.onclick = () => this.sendControl(false);

        // 2. 터미널 명령어 등록
        context.registerCommand('/ac', (cmd) => this.handleCommand(cmd));
        context.registerCommand('/climate-control', (cmd) => this.handleCommand(cmd));

        // 3. 주기적 갱신 (1분)
        const refresh = () => this.fetchStatus();
        await refresh();
        this.updateTimer = setInterval(refresh, 60000);
    },

    fetchStatus: async function () {
        try {
            const res = await fetch('/api/plugins/climate-control/status');
            const data = await res.json();

            const tempEl = this.root.getElementById('cc-temp');
            const statusEl = this.root.getElementById('cc-status');
            const lastUpdateEl = this.root.getElementById('cc-last-update');

            if (tempEl && data.temp !== undefined) {
                tempEl.textContent = data.temp.toFixed(1);
            }

            if (statusEl) {
                const isOn = data.is_ac_on;
                statusEl.textContent = isOn ? this.context._t('climate.on') : this.context._t('climate.off');
                statusEl.className = 'status-text ' + (isOn ? 'on' : 'off');
            }

            if (lastUpdateEl) {
                lastUpdateEl.textContent = new Date().toLocaleTimeString();
            }

        } catch (e) {
            this.context.log("Status fetch failed: " + e.message);
        }
    },

    sendControl: async function (power) {
        try {
            const res = await fetch('/api/plugins/climate-control/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ power: power })
            });
            const result = await res.json();
            if (result.success) {
                this.context.log("AC " + (power ? "ON" : "OFF") + " command sent.");
                await this.fetchStatus();
                this.context.triggerReaction('joy', { message: this.context._t('climate.control_success') });
            } else {
                this.context.log("Control failed: " + result.error);
            }
        } catch (e) {
            this.context.log("Control request failed: " + e.message);
        }
    },

    handleCommand: async function (cmd) {
        const parts = cmd.split(' ');
        const action = parts[1]; // on, off, set

        if (action === 'on') {
            await this.sendControl(true);
        } else if (action === 'off') {
            await this.sendControl(false);
        } else if (action === 'set' && parts[2]) {
            const temp = parseInt(parts[2]);
            // 온도 설정 로직 (백엔드 연동)
            const res = await fetch('/api/plugins/climate-control/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ power: true, temp: temp })
            });
            this.context.log(`AC set to ${temp}°C`);
            await this.fetchStatus();
        } else {
            this.context.appendLog('SYSTEM', 'Usage: /ac [on|off|set <temp>]');
        }
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.context.log("Climate Control destroyed.");
    }
};
