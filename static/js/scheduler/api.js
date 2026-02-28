/**
 * AEGIS Scheduler - API Communication Module
 */
window.SchedulerAPI = {
    async getConfig() {
        console.log("[SchedulerAPI] Fetching config...");
        const res = await fetch('/scheduler_config');
        if (!res.ok) {
            console.error("[SchedulerAPI] Fetch Error:", res.status);
            throw new Error("Failed to fetch config");
        }
        const data = await res.json();
        console.log("[SchedulerAPI] Config loaded:", data);
        return data;
    },

    async saveConfig(config) {
        console.log("[SchedulerAPI] Saving config...", config);
        const res = await fetch('/save_scheduler_config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error("Failed to save config");
        const result = await res.json();
        console.log("[SchedulerAPI] Save result:", result);
        return result;
    }
};
