export default class NotionAPI {
    constructor(context) {
        this.context = context;
    }

    async getConfig() {
        try {
            const res = await this.context.fetch('/api/plugins/notion/config');
            if (res.ok) {
                const data = await res.json();
                if (data.success) return data.config;
            }
        } catch (e) {
            console.error("[Notion] Config fetch error:", e);
        }
        return null;
    }

    async getRecentItems(limit = 10) {
        try {
            const response = await this.context.fetch(`/api/plugins/notion/recent?limit=${limit}`);
            if (response.ok) return await response.json();
            throw new Error("API request failed");
        } catch (e) {
            console.error("[Notion] Recent items fetch error:", e);
            throw e;
        }
    }

    async triggerBriefing(model) {
        try {
            const response = await this.context.fetch(`/api/plugins/notion/brief?model=${model}`);
            if (response.ok) return await response.json();
            throw new Error("API request failed");
        } catch (e) {
            console.error("[Notion] Briefing fetch error:", e);
            throw e;
        }
    }

    async addItem(text, workspace) {
        try {
            const response = await this.context.fetch('/api/plugins/notion/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, workspace })
            });
            if (response.ok) return await response.json();
            throw new Error("API request failed");
        } catch (e) {
            console.error("[Notion] Add item error:", e);
            throw e;
        }
    }

    async searchItems(query) {
        try {
            const response = await this.context.fetch(`/api/plugins/notion/search?query=${encodeURIComponent(query)}`);
            if (response.ok) return await response.json();
            throw new Error("API request failed");
        } catch (e) {
            console.error("[Notion] Search error:", e);
            throw e;
        }
    }

    async evaluateRules() {
        try {
            const response = await this.context.fetch('/api/plugins/notion/rules/evaluate');
            if (response.ok) return await response.json();
            throw new Error("API request failed");
        } catch (e) {
            console.error("[Notion] Evaluate rules error:", e);
            throw e;
        }
    }

    async applyRule(pageId, action) {
        try {
            const response = await this.context.fetch('/api/plugins/notion/rules/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page_id: pageId, action })
            });
            if (response.ok) return await response.json();
            throw new Error("API request failed");
        } catch (e) {
            console.error("[Notion] Apply rule error:", e);
            throw e;
        }
    }
}
