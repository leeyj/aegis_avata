/**
 * Scheduler Tick Engine
 * The global 1s/1m interval engine for widgets and routines.
 */
export const schedulerTick = {
    interval: null,

    start: function (scheduler) {
        if (this.interval) clearInterval(this.interval);

        this.interval = setInterval(() => {
            const now = new Date();
            const secs = now.getSeconds();

            // 1. Every second (sec-type widgets)
            scheduler.widgets.filter(w => w.type === 'sec').forEach(w => w.callback(now));

            // 2. Every minute (min-type widgets and routines)
            if (secs === 0) {
                scheduler.widgets.filter(w => w.type === 'min').forEach(w => w.callback(now));
                scheduler.checkRoutines();
            }
        }, 1000);

        // Immediate first run
        const now = new Date();
        scheduler.widgets.forEach(w => w.callback(now));
        scheduler.checkRoutines();
    },

    stop: function () {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
};
