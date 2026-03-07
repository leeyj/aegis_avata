/**
 * AEGIS Plugin-X System Stats Widget (v1.0)
 */
export default {
    updateTimer: null,

    init: async function (shadowRoot, context) {
        context.log("System Stats Widget Initializing...");

        const content = shadowRoot.getElementById('system-stats-content');

        const updateStats = async () => {
            try {
                const res = await fetch('/api/plugins/system-stats/data');
                const data = await res.json();
                if (data.status === 'error') return;

                let html = '';

                // CPU
                if (data.cpu) {
                    html += `
                        <div class="stat-unit">
                            <div class="stat-header">
                                <span>CPU USAGE</span>
                                <span class="stat-value" style="color: var(--neon);">${data.cpu.percent}%</span>
                            </div>
                            <div class="stat-bar-bg">
                                <div class="stat-bar-fill" style="width: ${data.cpu.percent}%; background: var(--neon);"></div>
                            </div>
                        </div>
                    `;
                }

                // Memory
                if (data.memory) {
                    html += `
                        <div class="stat-unit">
                            <div class="stat-header">
                                <span>MEMORY (${data.memory.used}/${data.memory.total})</span>
                                <span class="stat-value" style="color: #32ff7e;">${data.memory.percent}%</span>
                            </div>
                            <div class="stat-bar-bg">
                                <div class="stat-bar-fill" style="width: ${data.memory.percent}%; background: #32ff7e;"></div>
                            </div>
                        </div>
                    `;
                }

                // Dynamic Disks
                if (data.disks && data.disks.length > 0) {
                    data.disks.forEach(disk => {
                        html += `
                            <div class="stat-unit">
                                <div class="stat-header">
                                    <span>${disk.name} (${disk.used}/${disk.total})</span>
                                    <span class="stat-value" style="color: #ffb8b8;">${disk.percent}%</span>
                                </div>
                                <div class="stat-bar-bg">
                                    <div class="stat-bar-fill" style="width: ${disk.percent}%; background: #ffb8b8;"></div>
                                </div>
                            </div>
                        `;
                    });
                }

                html += `<div class="uptime">UPTIME: ${data.uptime}</div>`;
                content.innerHTML = html;
            } catch (e) {
                context.log("Fetch Error: " + e.message);
            }
        };

        // 2. 실행 및 인터벌 설정
        updateStats();

        let tickCounter = 0;
        context.registerSchedule('system_stats', 'sec', () => {
            tickCounter++;
            if (tickCounter >= 5) { // 5초 주기
                updateStats();
                tickCounter = 0;
            }
        });



        // [v3.0] 터미널 명령어 등록
        context.registerCommand('/system-stats', () => {
            updateStats();
            context.appendLog('SYSTEM', '🖥️ 시스템 상태를 업데이트합니다.');
        });
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        console.log("[Plugin-X] System Stats Widget Destroyed.");
    }
};
