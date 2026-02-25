/**
 * AEGIS Widget Module - Calendar (Google Calendar)
 */
let upcomingEvents = [];
const notifiedEvents = new Set();

async function startCalendar() {
    const listEl = document.getElementById('calendar-list');
    if (!listEl) return;

    let config = { refresh_interval_min: 5 };
    try {
        const resConfig = await fetch('/google_config');
        config = Object.assign(config, await resConfig.json());
    } catch (e) { }

    const updateCalendar = async () => {
        try {
            const res = await fetch('/calendar_events');
            const data = await res.json();

            if (data.status === "SUCCESS") {
                if (data.events.length === 0) {
                    listEl.innerHTML = '<div style="font-size: 12px; opacity: 0.5;">No remaining events today.</div>';
                    upcomingEvents = [];
                } else {
                    listEl.innerHTML = '';
                    const seen = new Set();
                    const uniqueEvents = data.events.filter(ev => {
                        const key = `${ev.summary}-${ev.start}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });

                    upcomingEvents = uniqueEvents;

                    uniqueEvents.forEach(event => {
                        let timeStr = "";
                        if (event.is_all_day) {
                            timeStr = "All Day";
                        } else {
                            const dateObj = new Date(event.start);
                            timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }

                        const item = document.createElement('div');
                        item.style.marginBottom = '10px';
                        item.style.paddingBottom = '5px';
                        item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                        item.innerHTML = `
                            <div style="font-size: 10px; color: var(--neon); opacity: 0.8;">${timeStr}</div>
                            <div style="font-size: 13px; font-weight: 500;">${event.summary}</div>
                            ${event.location ? `<div style="font-size: 10px; opacity: 0.5;">📍 ${event.location}</div>` : ''}
                        `;
                        listEl.appendChild(item);
                    });
                }
            } else if (data.status === "AUTH_REQUIRED") {
                listEl.innerHTML = '<div style="font-size: 11px; color: #ffbc00;">⚠️ credentials.json required in config folder.</div>';
            } else {
                listEl.innerHTML = `<div style="font-size: 11px; color: #ff4b4b;">Error: ${data.message}</div>`;
            }
        } catch (e) { }
    };

    updateCalendar();
    const refreshMs = (config.refresh_interval_min || 5) * 60 * 1000;
    setInterval(updateCalendar, refreshMs);

    // 10분 전 알림 감시 로직
    setInterval(() => {
        const now = new Date();
        upcomingEvents.forEach(ev => {
            if (ev.is_all_day) return;
            const evTime = new Date(ev.start);
            const diffMins = Math.floor((evTime - now) / 60000);
            const key = `${ev.summary}-${ev.start}`;

            if (diffMins === 10 && !notifiedEvents.has(key)) {
                notifiedEvents.add(key);
                speakTTS(`10분 뒤, ${ev.summary} 일정이 시작됩니다.`);
                if (window.playMotionFile) window.playMotionFile("TapBody.motion3.json");
            }
        });
    }, 10000);
}
