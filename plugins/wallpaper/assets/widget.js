/**
 * AEGIS Wallpaper Plugin-X Entry (v4.0 Proxy)
 */
export default {
    init: async function (root, context) {
        context.log("Wallpaper Widget Initializing [Proxy Mode]...");

        const ProxyWallpaperManager = {
            root: root,
            context: context,
            config: {},
            isSponsor: false,

            async init() {
                try {
                    // 1. Fetch current status from Core
                    const data = await context.requestCore('WP_GET_STATUS', {});
                    this.isSponsor = data.isSponsor;
                    this.config = data.config;

                    this.render();
                } catch (e) {
                    console.error("[Wallpaper Proxy] Init failed:", e);
                }

                // Listen for gallery selection from host
                context.on('WP_GALLERY_SELECTED', (data) => {
                    this.updateConfig({ mode: 'static', current: data.url, is_video: data.isVideo });
                });
            },

            async updateConfig(newVal) {
                this.config = { ...this.config, ...newVal };
                if (typeof this.config.current === 'string') {
                    const low = this.config.current.toLowerCase();
                    this.config.is_video = low.endsWith('.mp4') || low.endsWith('.webm');
                }

                // Bridge to host to actually apply the wallpaper
                const res = await context.requestCore('WP_APPLY', { config: this.config });
                if (res.success && res.config) this.config = res.config;

                this.render();
            },

            async handleUpload(input) {
                console.log("[Wallpaper] handleUpload triggered", input.files);
                if (!input.files || input.files.length === 0) {
                    console.log("[Wallpaper] No files selected");
                    return;
                }
                const btn = this.root.querySelector('.wp-browse-btn');
                if (btn) btn.innerText = "⌛ UPLOADING...";

                try {
                    for (const file of input.files) {
                        console.log("[Wallpaper] Preparing upload for:", file.name, "Size:", file.size);

                        // [v4.0] Optimized Binary Transfer: Send 'File' directly in body
                        // Bridge clones File objects efficiently via postMessage (unlike FormData)
                        console.log("[Wallpaper] Sending Binary request via Bridge...");
                        const res = await context.fetch('upload', {
                            method: 'POST',
                            headers: {
                                'X-File-Name': encodeURIComponent(file.name),
                                'Content-Type': file.type || 'application/octet-stream'
                            },
                            body: file // Raw File object (Cloneable!)
                        });

                        console.log("[Wallpaper] Response received:", res.status);
                        const lastData = await res.json();
                        console.log("[Wallpaper] Response body:", lastData);

                        if (input.files.length === 1 && lastData.status === 'success') {
                            await this.updateConfig({ mode: 'static', current: lastData.url, is_video: lastData.is_video });
                        }
                    }
                    if (btn) btn.innerText = "✅ DONE";
                } catch (e) {
                    console.error("[Wallpaper] Upload exception:", e);
                    if (btn) btn.innerText = "❌ FAIL";
                } finally {
                    setTimeout(() => { if (btn) btn.innerText = "📁 BROWSE"; }, 2000);
                }
            },

            handleModeChange(val) {
                const next = { mode: val };
                if (val === 'solid') {
                    next.current = '#000000';
                    next.is_video = false;
                }
                this.updateConfig(next);
            },

            handleURLChange(url) {
                const isVideo = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm');
                this.updateConfig({ mode: 'url', current: url, is_video: isVideo });
            },

            async openGallery() {
                await context.requestCore('WP_GALLERY', {});
            },

            async saveRequested() {
                const btn = this.root.querySelector('.wp-save-btn');
                if (btn) btn.innerText = "⌛ SAVING...";
                try {
                    await context.requestCore('WP_SAVE', {});
                    if (btn) btn.innerText = "✅ SAVED";
                } catch (e) {
                    if (btn) btn.innerText = "❌ ERROR";
                } finally {
                    setTimeout(() => { if (btn) btn.innerText = "💾 SAVE SYNC"; }, 2000);
                }
            },

            render() {
                const container = this.root.getElementById('p-wallpaper-content');
                if (!container) return;

                const { isSponsor, config } = this;
                const premiumAttr = isSponsor ? '' : 'disabled style="opacity: 0.5"';

                // [v4.0] Invalid URL prevention (prevent 404 on color codes)
                let bgStyle = "";
                if (config.mode === 'solid') {
                    bgStyle = `background-color: ${config.current || '#000000'}`;
                } else if (config.current && (config.current.startsWith('http') || config.current.startsWith('/'))) {
                    bgStyle = `background-image: url('${config.current}')`;
                } else if (config.current && !config.current.startsWith('#')) {
                    // It's likely a relative path from our own static
                    bgStyle = `background-image: url('/static/wallpaper/${config.current}')`;
                }

                container.innerHTML = `
                    <div class="wallpaper-content">
                        <div class="wp-preview-container" id="wp-preview-trigger">
                            <div class="wp-preview" style="${bgStyle}"></div>
                            <div class="wp-preview-overlay">CHANGE IMAGE</div>
                        </div>
                        
                        <div class="wp-options">
                            <div class="wp-row">
                                <span>UPLOAD MEDIA</span>
                                <input type="file" id="wp-file-input" style="display:none" multiple>
                                <button class="wp-browse-btn">📁 BROWSE</button>
                            </div>

                            <div class="wp-row">
                                <span>COLLECTION</span>
                                <button class="wp-browse-btn" style="border-color: #f1c40f;" id="wp-gallery-btn">🖼️ GALLERY</button>
                            </div>
                            
                            <div class="wp-row" style="display: ${config.mode === 'solid' ? 'flex' : 'none'}">
                                <span>COLOR PICK</span>
                                <input type="color" class="wp-input" id="wp-color-pick" 
                                       value="${(config.mode === 'solid' && config.current) ? config.current : '#000000'}">
                            </div>

                            <div class="wp-row" style="display: ${config.mode === 'url' ? 'flex' : 'none'}; ${isSponsor ? '' : 'opacity: 0.5'}">
                                <span>REMOTE URL ${isSponsor ? '' : '💎'}</span>
                                <input type="text" class="wp-input" id="wp-url-input" ${isSponsor ? '' : 'disabled'}
                                       value="${config.mode === 'url' ? config.current : ''}" placeholder="http://...">
                            </div>
                            
                            <div class="wp-row">
                                <span>CORE MODE</span>
                                <select class="wp-input" id="wp-mode-select">
                                    <option value="static" ${config.mode === 'static' ? 'selected' : ''}>STATIC</option>
                                    <option value="solid" ${config.mode === 'solid' ? 'selected' : ''}>SOLID COLOR</option>
                                    <option value="url" ${config.mode === 'url' ? 'selected' : ''} ${isSponsor ? '' : 'disabled'}>URL ${isSponsor ? '' : '💎'}</option>
                                    <option value="rotation" ${config.mode === 'rotation' ? 'selected' : ''} ${isSponsor ? '' : 'disabled'}>ROTATION ${isSponsor ? '' : '💎'}</option>
                                </select>
                            </div>

                            <button class="wp-save-btn">💾 SAVE SYNC</button>
                        </div>
                    </div>
                `;

                // Re-bind events programmatically (Shadow DOM safe)
                const previewTrigger = this.root.getElementById('wp-preview-trigger');
                const fileInput = this.root.getElementById('wp-file-input');
                const browseBtn = this.root.querySelector('.wp-browse-btn');
                const galleryBtn = this.root.getElementById('wp-gallery-btn');
                const saveBtn = this.root.querySelector('.wp-save-btn');
                const modeSelect = this.root.getElementById('wp-mode-select');
                const urlInput = this.root.getElementById('wp-url-input');
                const colorPick = this.root.getElementById('wp-color-pick');

                if (previewTrigger && fileInput) {
                    previewTrigger.onclick = () => {
                        console.log("[Wallpaper] Preview clicked -> triggering file input");
                        fileInput.click();
                    };
                }

                if (browseBtn && fileInput) {
                    browseBtn.onclick = () => {
                        console.log("[Wallpaper] Browse clicked -> triggering file input");
                        fileInput.click();
                    };
                }

                if (fileInput) {
                    fileInput.onchange = (e) => {
                        console.log("[Wallpaper] File input changed");
                        this.handleUpload(e.target);
                    };
                }

                if (galleryBtn) galleryBtn.onclick = () => this.openGallery();
                if (saveBtn) saveBtn.onclick = () => this.saveRequested();
                if (modeSelect) modeSelect.onchange = (e) => this.handleModeChange(e.target.value);
                if (urlInput) urlInput.onchange = (e) => this.handleURLChange(e.target.value);
                if (colorPick) colorPick.onchange = (e) => this.updateConfig({ current: e.target.value });

                console.log("[Wallpaper] Event listeners re-bound");
            }
        };

        // Expose to window for inline onclick handlers if necessary (though we re-bound them)
        window.WallpaperManager = ProxyWallpaperManager;

        await ProxyWallpaperManager.init();

        // Terminal Commands
        const handleWPCommand = async (cmd) => {
            const parts = cmd.split(' ');
            const action = parts[1];

            if (action === 'solid' && parts[2]) {
                await ProxyWallpaperManager.updateConfig({ mode: 'solid', current: parts[2], is_video: false });
                context.appendLog('WALLPAPER', `🎨 배경색이 ${parts[2]}색으로 변경되었습니다.`);
            } else if (action === 'url' && parts[2]) {
                if (!ProxyWallpaperManager.isSponsor) {
                    context.appendLog('SYSTEM', '❌ 웹 배경(URL) 기능은 스폰서 전용 기능입니다.');
                    return;
                }
                ProxyWallpaperManager.handleURLChange(parts[2]);
                context.appendLog('WALLPAPER', `🌐 웹 배경(URL)이 적용되었습니다.`);
            } else if (action === 'mode' && parts[2]) {
                ProxyWallpaperManager.handleModeChange(parts[2]);
            }
        };

        context.registerCommand('/wp', handleWPCommand);
        context.registerCommand('/wallpaper', handleWPCommand);
    },

    destroy: function () {
        console.log("[Plugin-X] Wallpaper Widget Destroyed.");
    }
};
