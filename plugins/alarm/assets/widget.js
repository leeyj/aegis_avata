export default {
    init: async function (root, context) {
        this.root = root;
        this.context = context;

        this.updateList();

        // [v4.2] 실시간 동기화 (System Event Bridge)
        context.onSystemEvent('ALARM_SYNC', () => {
            console.log("[AlarmWidget] Syncing active alarms...");
            this.updateList();
        });
        context.onSystemEvent('ALARM_LIST_SYNC', () => {
            this.updateList();
        });

        // 30초마다 자동 갱신
        setInterval(() => this.updateList(), 30000);

        // Capability: Briefing 등록 (가끔 알람 상태 브리핑)
        context.registerSchedule('alarm-checker', 600, () => {
            return this.updateList();
        });

        // 커맨드 등록 (예: /알람 확인)
        context.registerCommand('알람', (args) => {
            this.updateList();
            return "알람 목록을 갱신했습니다.";
        });

        console.log("[AlarmWidget] Initialized.");
    },

    updateList: async function () {
        try {
            const res = await fetch('/api/plugins/alarm/list');
            const data = await res.json();

            if (data.status === 'success') {
                this.render(data.alarms);
            }
        } catch (e) {
            console.error("[AlarmWidget] Update failed:", e);
        }
    },

    render: function (alarms) {
        const listEl = this.root.getElementById('alarm-list');
        const countEl = this.root.getElementById('alarm-count');

        if (!listEl) return;

        countEl.textContent = alarms.length;

        if (alarms.length === 0) {
            listEl.innerHTML = '<li class="empty-msg">대기 중인 알람이 없습니다.</li>';
            return;
        }

        listEl.innerHTML = alarms.map(alarm => `
            <li class="alarm-item">
                <span class="time">${alarm.time}</span>
                <span class="title">${alarm.title}</span>
            </li>
        `).join('');
    }
}
