/**
 * AEGIS Wallpaper Manager - Main Module (v1.6.8 Modularized)
 * Fixed for Plugin-X / Shadow DOM compatibility.
 */
window.WallpaperManager = {
    isSponsor: false,
    shadowRoot: document,

    async init(shadowRoot = null) {
        this.shadowRoot = shadowRoot || document;
        console.log("[Wallpaper] Initializing Modularized V1.5...");
        try {
            const data = await WallpaperAPI.getStatus();
            this.isSponsor = data.is_sponsor;
            this.config = data.config;

            window.WallpaperUI.applyWallpaper(this.config);
            window.WallpaperUI.renderWidget(this, this.shadowRoot);

            if (this.isSponsor && this.config.mode === 'rotation') {
                await this.loadRotation();
            }
        } catch (e) {
            console.error("[Wallpaper] Init failed:", e);
        }
    },

    async updateConfig(newVal) {
        if (!this.config) {
            console.warn("[Wallpaper] updateConfig called before init. Fetching status...");
            const data = await WallpaperAPI.getStatus();
            this.config = data.config;
        }

        // [Logic Fix] 모드 변경 시 이전 모드의 특수 플래그 초기화
        if (newVal.mode && newVal.mode !== this.config.mode) {
            this.config.is_video = false;
        }

        this.config = { ...this.config, ...newVal };

        // [Logic Fix] current 값에 따른 비디오 여부 자동 재검토 (URL 또는 특정 파일일 경우)
        if (typeof this.config.current === 'string') {
            const low = this.config.current.toLowerCase();
            this.config.is_video = low.endsWith('.mp4') || low.endsWith('.webm');
        }

        try {
            await WallpaperAPI.setConfig(this.config);

            if (this.config.mode === 'rotation') {
                await this.loadRotation();
            } else {
                this.stopRotation();
                window.WallpaperUI.applyWallpaper(this.config);
            }
            window.WallpaperUI.renderWidget(this, this.shadowRoot);
        } catch (e) {
            console.error("[Wallpaper] UpdateConfig failed:", e);
        }
    },

    async handleUpload(input) {
        if (!input.files || input.files.length === 0) return;

        // Shadow DOM 호환 셀렉터
        const root = this.shadowRoot || document;
        const btn = root.querySelector('.wp-browse-btn');

        const originalText = btn ? btn.innerText : "BROWSE";
        if (btn) {
            btn.innerText = "⌛ UPLOADING...";
            btn.disabled = true;
        }

        try {
            let lastData = null;
            for (const file of input.files) {
                lastData = await WallpaperAPI.upload(file);
            }
            if (input.files.length === 1 && lastData && lastData.status === 'success') {
                await this.updateConfig({ mode: 'static', current: lastData.url, is_video: lastData.is_video });
                if (btn) btn.innerText = "✅ APPLIED!";
            } else {
                const updated = await WallpaperAPI.getStatus();
                this.isSponsor = updated.is_sponsor;
                this.config = updated.config;
                window.WallpaperUI.renderWidget(this, this.shadowRoot);
                if (btn) btn.innerText = "✅ UPLOADED!";
            }
        } catch (e) {
            if (btn) btn.innerText = "❌ FAILED";
        } finally {
            if (btn) setTimeout(() => { btn.innerText = originalText; btn.disabled = false; }, 2000);
        }
    },

    handleModeChange(val) {
        const next = { mode: val };
        // 모드 전환 시 기본값 설정 및 비디오 플래그 강제 리셋
        if (val === 'solid') {
            next.current = '#000000';
            next.is_video = false;
        } else if (val === 'static' || val === 'url') {
            next.is_video = false; // 이후 current 검증에서 다시 설정됨
        }
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
                    window.WallpaperUI.applyWallpaper(this.config);
                    tickCounter = 0;
                    window.WallpaperUI.renderWidget(this, this.shadowRoot);
                }
            });
        }
    },

    stopRotation() {
        // [MOD] 브리핑 스케줄러에서 제거 로직 (필요시 구현)
    },

    async openGallery() {
        try {
            const data = await WallpaperAPI.getList();
            window.WallpaperUI.openGallery(data.files || []);
        } catch (e) {
            console.error("[Wallpaper] Gallery open failed:", e);
        }
    },

    closeGallery() { window.WallpaperUI.closeGallery(); },

    selectFromGallery(url, isVideo) {
        this.updateConfig({ mode: 'static', current: url, is_video: isVideo });
        this.closeGallery();
    },

    async saveRequested() {
        const root = this.shadowRoot || document;
        const btn = root.querySelector('.wp-save-btn');

        const originalText = btn ? btn.innerText : "SAVE";
        if (btn) {
            btn.innerText = "⌛ SAVING...";
            btn.disabled = true;
        }

        try {
            await WallpaperAPI.setConfig(this.config);
            if (btn) btn.innerText = "✅ SAVED!";
            setTimeout(() => { if (btn) { btn.innerText = originalText; btn.disabled = false; } }, 1800);
        } catch (e) {
            if (btn) btn.innerText = "❌ ERROR";
            setTimeout(() => { if (btn) { btn.innerText = originalText; btn.disabled = false; } }, 1800);
        }
    },

    setupBridge() {
        if (!window.messageBroker || !window.messageBroker.registerHandler) return;

        window.messageBroker.registerHandler('WP_GET_STATUS', async () => {
            if (!this.config) {
                const data = await WallpaperAPI.getStatus();
                this.isSponsor = data.is_sponsor;
                this.config = data.config;
            }
            return { isSponsor: this.isSponsor, config: this.config };
        });

        window.messageBroker.registerHandler('WP_APPLY', async (data) => {
            await this.updateConfig(data.config);
            return { success: true, config: this.config };
        });

        window.messageBroker.registerHandler('WP_GALLERY', async (data, source) => {
            const filesRes = await WallpaperAPI.getList();
            const files = filesRes.files || [];

            const originalSelect = this.selectFromGallery.bind(this);
            this.selectFromGallery = (url, isVideo) => {
                window.messageBroker.send(source, 'WP_GALLERY_SELECTED', { url, isVideo });
                this.selectFromGallery = originalSelect;
                this.closeGallery();
            };
            window.WallpaperUI.openGallery(files);
            return { success: true };
        });

        window.messageBroker.registerHandler('WP_SAVE', async () => {
            await this.saveRequested();
            return { success: true };
        });

        console.log("[Wallpaper] Message Bridge Setup Complete.");
    }
};

// [Plugin-X] 자동 실행 제거 (widget.js에서 수동 제어)
// document.addEventListener('DOMContentLoaded', () => WallpaperManager.init());
window.WallpaperManager.setupBridge();
