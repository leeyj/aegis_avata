/**
 * AEGIS Wallpaper - API Module
 */
window.WallpaperAPI = {
    async getStatus() {
        const res = await fetch('/api/wallpaper/status');
        if (!res.ok) throw new Error("Status API fail");
        return await res.json();
    },

    async getList() {
        const res = await fetch('/api/wallpaper/list');
        if (!res.ok) throw new Error("List API fail");
        return await res.json();
    },

    async upload(file) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/wallpaper/upload', {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error("Upload fail");
        return await res.json();
    },

    async setConfig(config) {
        const res = await fetch('/api/wallpaper/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error("Save config fail");
        return await res.json();
    }
};
