export default class SchedulerAPI {
    constructor(context) {
        this.context = context;
        this.cachedExports = null;
    }

    async getConfig() {
        try {
            const res = await this.context.fetch('/api/plugins/scheduler/config');
            if (res.ok) return await res.json();
            throw new Error("Failed to fetch config");
        } catch (e) {
            console.error("[Scheduler] Fetch config err:", e);
            throw e;
        }
    }

    async saveConfig(config) {
        const res = await this.context.fetch('/api/plugins/scheduler/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error("Failed to save config");
        return await res.json();
    }

    async getExports() {
        if (!this.cachedExports) {
            try {
                const res = await this.context.fetch('/api/plugins/scheduler/exports');
                this.cachedExports = await res.json();
            } catch (e) {
                console.warn('[Scheduler] Failed to load exports:', e);
                this.cachedExports = { sensors: [], commands: [], actions: [] };
            }
        }
        return this.cachedExports;
    }
}
