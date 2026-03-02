/**
 * AEGIS Calendar Widget (v1.8.0 Plugin-X)
 */
export default {
    upcomingEvents: [],
    notifiedEvents: new Set(),
    updateTimer: null,
    alertTimer: null,
    config: { refresh_interval_min: 5 },

    init: async function (shadowRoot, context) {
        context.log("Calendar Widget Initializing...");
        const listEl = shadowRoot.getElementById('calendar-list');
        if (!listEl) return;

        // 1. 설정 로드
        try {
            const res = await fetch('/api/plugins/calendar/config');
            const serverConfig = await res.json();
            Object.assign(this.config, serverConfig);
        } catch (e) {
            context.log("Failed to load Calendar config.");
        }

        const updateCalendar = async () => {
            try {
                const res = await fetch('/api/plugins/calendar/events');
                const data = await res.json();

                if (data.status === "SUCCESS") {
                    if (data.events.length === 0) {
                        listEl.innerHTML = '<div style="font-size: 12px; opacity: 0.5;">No remaining events today.</div>';
                        this.upcomingEvents = [];
                    } else {
                        listEl.innerHTML = '';
                        const seen = new Set();
                        this.upcomingEvents = data.events.filter(ev => {
                            const key = `${ev.summary}-${ev.start}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        });

                        this.upcomingEvents.forEach(event => {
                            let timeStr = event.is_all_day ? "All Day" : new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                            const item = document.createElement('div');
                            item.className = "calendar-item";
                            item.innerHTML = `
                                <div class="time">${timeStr}</div>
                                <div class="summary">${event.summary}</div>
                                ${event.location ? `<div class="location">📍 ${event.location}</div>` : ''}
                            `;
                            listEl.appendChild(item);
                        });
                    }
                } else {
                    listEl.innerHTML = `<div class="status-msg">${data.message || 'Error loading calendar.'}</div>`;
                }
            } catch (e) {
                context.log("Calendar update failed: " + e.message);
            }
        };

        const checkAlerts = () => {
            const now = new Date();
            this.upcomingEvents.forEach(ev => {
                if (ev.is_all_day) return;
                const evTime = new Date(ev.start);
                const diffMins = Math.floor((evTime - now) / 60000);
                const key = `${ev.summary}-${ev.start}`;

                if (diffMins === 10 && !this.notifiedEvents.has(key)) {
                    this.notifiedEvents.add(key);
                    context.speak(`10분 뒤, ${ev.summary} 일정이 시작됩니다.`);
                    context.triggerReaction('calendar_alert', { event: ev.summary }, 0);
                }
            });
        };

        // 2. 초기 실행 및 스케줄러 등록
        updateCalendar();

        let updateTick = 0;
        let alertTick = 0;
        context.registerSchedule('calendar_update', 'min', () => {
            updateTick++;
            if (updateTick >= this.config.refresh_interval_min) {
                updateCalendar();
                updateTick = 0;
            }
        });
        context.registerSchedule('calendar_alert', 'sec', () => {
            alertTick++;
            if (alertTick >= 10) {
                checkAlerts();
                alertTick = 0;
            }
        });
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        if (this.alertTimer) clearInterval(this.alertTimer);
        console.log("[Plugin-X] Calendar Widget Destroyed.");
    }
};
