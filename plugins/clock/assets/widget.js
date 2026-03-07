/**
 * AEGIS Plugin-X Standard Clock
 */
export default {
    timer: null,

    init: function (shadowRoot, context) {
        const clockEl = shadowRoot.getElementById('clock-display');
        const dateEl = shadowRoot.getElementById('date-display');

        const update = () => {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString('ko-KR', { hour12: false });
            dateEl.textContent = now.toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
            }).toUpperCase();
        };

        update();
        this.timer = setInterval(update, 1000);
    },

    destroy: function () {
        if (this.timer) clearInterval(this.timer);
    }
};
