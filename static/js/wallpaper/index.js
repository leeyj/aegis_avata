/**
 * AEGIS Wallpaper Manager - Main Module (v1.5)
 * Centralizes orchestration for backgrounds.
 */
window.WallpaperManager = {
    isSponsor: false,
    config: { mode: 'static', current: '', interval: 300, is_video: false },
    rotationList: [],

    async init() {
        console.log("[Wallpaper] Initializing Modularized V1.5...");
        try {
            const data = await WallpaperAPI.getStatus();
            this.isSponsor = data.is_sponsor;
            this.config = data.config;

            WallpaperUI.applyWallpaper(this.config);
            WallpaperUI.renderWidget(this);

            if (this.isSponsor && this.config.mode === 'rotation') {
                await this.loadRotation();
            }
        } catch (e) {
            console.error("[Wallpaper] Init failed:", e);
        }
    },

    async updateConfig(newVal) {
        this.config = { ...this.config, ...newVal };
        try {
            await WallpaperAPI.setConfig(this.config);

            if (this.config.mode === 'rotation') {
                await this.loadRotation();
            } else {
                this.stopRotation();
                WallpaperUI.applyWallpaper(this.config);
            }
            WallpaperUI.renderWidget(this);
        } catch (e) {
            console.error("[Wallpaper] UpdateConfig failed:", e);
        }
    },

    async handleUpload(input) {
        if (!input.files || input.files.length === 0) return;
        const btn = document.querySelector('.wp-browse-btn');
        const originalText = btn.innerText;
        btn.innerText = "⌛ UPLOADING...";
        btn.disabled = true;

        try {
            let lastData = null;
            for (const file of input.files) {
                lastData = await WallpaperAPI.upload(file);
            }
            if (input.files.length === 1 && lastData && lastData.status === 'success') {
                await this.updateConfig({ mode: 'static', current: lastData.url, is_video: lastData.is_video });
                btn.innerText = "✅ APPLIED!";
            } else {
                const updated = await WallpaperAPI.getStatus();
                this.isSponsor = updated.is_sponsor;
                this.config = updated.config;
                WallpaperUI.renderWidget(this);
                btn.innerText = "✅ UPLOADED!";
            }
        } catch (e) {
            btn.innerText = "❌ FAILED";
        } finally {
            setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
        }
    },

    handleModeChange(val) {
        const next = { mode: val };
        if (val === 'solid') next.current = '#000000';
        this.updateConfig(next);
    },

    handleURLChange(url) {
        const isVideo = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm');
        this.updateConfig({ current: url, is_video: isVideo });
    },

    async loadRotation() {
        try {
            const data = await WallpaperAPI.getList();
            this.rotationList = data.files || [];
            this.startRotation();
        } catch (e) {
            console.error("[Wallpaper] Failed to load rotation list:", e);
        }
    },

    startRotation() {
        this.stopRotation();
        if (this.rotationList.length === 0) return;

        let idx = 0;
        let tickCounter = 0;
        const intervalSec = this.config.interval || 300;

        if (window.briefingScheduler) {
            window.briefingScheduler.registerWidget('wallpaper_rotation', 'sec', () => {
                if (this.config.mode !== 'rotation') return; // Double check
                tickCounter++;
                if (tickCounter >= intervalSec) {
                    idx = (idx + 1) % this.rotationList.length;
                    const file = this.rotationList[idx];
                    this.config.current = `/static/wallpaper/${file}`;
                    this.config.is_video = file.toLowerCase().endsWith('.mp4');
                    WallpaperUI.applyWallpaper(this.config);
                    tickCounter = 0;
                    WallpaperUI.renderWidget(this);
                }
            });
        }
    },

    stopRotation() {
        if (window.briefingScheduler) {
            // Overwrite with empty callback or handle within the callback via mode check
        }
    },

    async openGallery() {
        try {
            const data = await WallpaperAPI.getList();
            WallpaperUI.openGallery(data.files || []);
        } catch (e) {
            console.error("[Wallpaper] Gallery open failed:", e);
        }
    },

    closeGallery() { WallpaperUI.closeGallery(); },

    selectFromGallery(url, isVideo) {
        this.updateConfig({ mode: 'static', current: url, is_video: isVideo });
        this.closeGallery();
    },

    async saveRequested() {
        const btn = document.querySelector('.wp-save-btn');
        const originalText = btn.innerText;
        btn.innerText = "⌛ SAVING...";
        btn.disabled = true;

        try {
            await WallpaperAPI.setConfig(this.config);
            btn.innerText = "✅ SAVED!";
            setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 1800);
        } catch (e) {
            btn.innerText = "❌ ERROR";
            setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 1800);
        }
    }
};

// Auto-run on load
document.addEventListener('DOMContentLoaded', () => WallpaperManager.init());
