/**
 * AEGIS Plugin-X Standard Clock
 */
export default {
    timer: null,

    init: function (root, context) {
        const clockEl = root.getElementById('clock-display');
        const dateEl = root.getElementById('date-display');

        const update = () => {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString('ko-KR', { hour12: false });
            dateEl.textContent = now.toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
            }).toUpperCase();
        };

        update();
        context.registerSchedule('clock_tick', 'sec', () => {
            update();
        });
    },

    destroy: function () {
        if (this.timer) clearInterval(this.timer);
    }
};
