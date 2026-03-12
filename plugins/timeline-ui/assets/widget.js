/**
 * AEGIS Timeline Widget (v1.0.1 Plugin-X)
 */
export default {
    root: null,
    context: null,
    updateInterval: null,

    init: async function (root, context) {
        this.root = root;
        this.context = context;

        context.log("Timeline Widget Initializing...");

        this.renderTimeline();

        // 1분마다 업데이트 스케줄 등록
        context.registerSchedule(this.context.id + '_update', 'min', () => {
            this.renderTimeline();
        });

        // 수동 새로고침 명령 등록
        context.registerCommand('/timeline-refresh', () => {
            this.renderTimeline();
            context.appendLog('TIMELINE', '⏳ 타임라인을 새로고침합니다.');
        });
    },

    renderTimeline: async function () {
        try {
            const response = await fetch('/api/plugins/timeline-ui/data');
            const data = await response.json();

            const allDayContainer = this.root.getElementById('timelineAllDayContainer');
            const timedTrackArea = this.root.getElementById('timelineTimedTrackArea');

            if (!allDayContainer || !timedTrackArea) return;

            allDayContainer.innerHTML = '';
            timedTrackArea.innerHTML = '';

            if (data.status === "SUCCESS" && data.events && data.events.length > 0) {
                const colors = ["#38bdf8", "#fb7185", "#4ade80", "#a78bfa", "#fbbf24"];
                let timedIdx = 0;

                // 24시간 가시성 확보를 위해 현재 시간 기준 전후로 유연하게 처리할 수 있으나,
                // 현재 UI 디자인이 09-24(15시간) 기준이므로 범위를 유지하되 필터링 고도화
                data.events.forEach((ev, idx) => {
                    const color = colors[idx % colors.length];

                    if (ev.is_all_day) {
                        const pill = document.createElement('div');
                        pill.className = 'all-day-pill';
                        pill.style.borderColor = color;
                        pill.style.background = this.hexToRgba(color, 0.1);
                        pill.style.color = color;
                        pill.innerText = `📌 ${ev.summary}`;
                        allDayContainer.appendChild(pill);
                    } else if (ev.start) {
                        // "2026-03-07T14:00:00+09:00" -> 14:00
                        const timePart = ev.start.includes('T') ? ev.start.split('T')[1] : ev.start;
                        const startTimeStr = timePart.substring(0, 5);
                        const [h, m] = startTimeStr.split(':').map(Number);

                        // 00:00 ~ 24:00 전체 범위 지원 (임시로 09-24 컨테이너에 맞춰 스케일링)
                        // 만약 09시 이전 일정이라면 9시 지점에 표시하거나 로그 남김
                        let displayH = h;
                        if (h < 9) displayH = 9; // 9시 이전은 시작점에 붙임

                        const left = ((displayH - 9) + (m / 60)) / 15 * 100;
                        const top = 6 + ((timedIdx % 4) * 32); // 동시성 겹침 방지 (4줄로 확대)
                        timedIdx++;

                        const bar = document.createElement('div');
                        bar.className = 'timeline-bar';
                        bar.style.left = `${Math.max(0, Math.min(95, left))}%`;
                        bar.style.top = `${top}px`;
                        bar.style.background = this.hexToRgba(color, 0.2);
                        bar.style.borderColor = color;
                        bar.title = `${startTimeStr} - ${ev.summary}`;
                        bar.innerHTML = `<strong>${startTimeStr}</strong> &nbsp; ${ev.summary}`;
                        timedTrackArea.appendChild(bar);
                    }
                });

                allDayContainer.style.display = allDayContainer.children.length > 0 ? 'flex' : 'none';
            } else {
                timedTrackArea.innerHTML = '<div style="padding: 30px; text-align: center; color: rgba(255,255,255,0.3); font-size: 0.8rem; height: 100%; display: flex; align-items: center; justify-content: center;">오늘 일정이 없습니다.</div>';
                allDayContainer.style.display = 'none';
            }

            this.updateCurrentTimeLine();
        } catch (error) {
            console.error("[Timeline-UI] Error updating timeline:", error);
        }
    },

    updateCurrentTimeLine: function () {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const line = this.root.getElementById('timelineCurrentTimeLine');
        if (!line) return;

        // 09시 ~ 24시 범위 내에서만 표시
        if (hours >= 9 && hours <= 23) {
            const percent = ((hours - 9) + (minutes / 60)) / 15 * 100;
            line.style.left = percent + '%';
            line.style.display = 'block';
        } else {
            line.style.display = 'none';
        }
    },

    hexToRgba: function (hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    destroy: function () {
        if (this.updateInterval) clearInterval(this.updateInterval);
        console.log("[Timeline-UI] Widget destroyed");
    }
};
