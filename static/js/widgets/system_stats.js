/**
 * AEGIS System Stats Widget
 * Configurable monitoring for CPU, RAM, and multiple Disks
 */

function initSystemStats() {
    updateSystemStats();

    if (window.briefingScheduler) {
        let tickCounter = 0;
        window.briefingScheduler.registerWidget('system_stats', 'sec', () => {
            tickCounter++;
            if (tickCounter >= 5) { // 5초 주기
                updateSystemStats();
                tickCounter = 0;
            }
        });
    } else {
        setInterval(updateSystemStats, 5000);
    }
}

async function updateSystemStats() {
    const container = document.getElementById('system-stats-content');
    if (!container) return;

    try {
        const res = await fetch('/system_stats');
        const data = await res.json();

        if (data.status === 'error') return;

        let html = '';

        // 1. CPU
        if (data.cpu) {
            html += `
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                        <span>CPU USAGE</span>
                        <span style="color: var(--neon); font-family: 'Orbitron';">${data.cpu.percent}%</span>
                    </div>
                    <div class="stat-bar-bg">
                        <div class="stat-bar-fill" style="width: ${data.cpu.percent}%; background: var(--neon);"></div>
                    </div>
                </div>
            `;
        }

        // 2. Memory
        if (data.memory) {
            html += `
                <div style="margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                        <span>MEMORY (${data.memory.used}/${data.memory.total})</span>
                        <span style="color: #32ff7e; font-family: 'Orbitron';">${data.memory.percent}%</span>
                    </div>
                    <div class="stat-bar-bg">
                        <div class="stat-bar-fill" style="width: ${data.memory.percent}%; background: #32ff7e;"></div>
                    </div>
                </div>
            `;
        }

        // 3. Dynamic Disks
        if (data.disks && data.disks.length > 0) {
            data.disks.forEach(disk => {
                html += `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                            <span>${disk.name} (${disk.used}/${disk.total})</span>
                            <span style="color: #ffb8b8; font-family: 'Orbitron';">${disk.percent}%</span>
                        </div>
                        <div class="stat-bar-bg">
                            <div class="stat-bar-fill" style="width: ${disk.percent}%; background: #ffb8b8;"></div>
                        </div>
                    </div>
                `;
            });
        }

        html += `
            <div style="margin-top: 10px; font-size: 9px; opacity: 0.5; text-align: right; font-family: 'Orbitron'; letter-spacing: 1px;">
                UPTIME: ${data.uptime}
            </div>
        `;

        container.innerHTML = html;
    } catch (e) {
        console.error("[SystemStats] Fetch failed:", e);
    }
}

// 초기화 대기
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSystemStats);
} else {
    initSystemStats();
}
