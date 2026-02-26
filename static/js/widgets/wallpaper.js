/**
 * AEGIS Wallpaper Manager
 * Handles static images, video backgrounds, and rotations.
 * Differentiated by Sponsor status.
 */

const WallpaperManager = {
    isSponsor: false,
    config: {
        mode: 'static',
        current: '',
        interval: 300,
        is_video: false
    },
    rotationList: [],
    timer: null,

    async init() {
        console.log("[Wallpaper] Initializing...");
        await this.refreshStatus();
        this.applyWallpaper();
        this.renderUI();
    },

    async refreshStatus() {
        try {
            const res = await fetch('/api/wallpaper/status');
            if (!res.ok) {
                console.error("[Wallpaper] API Error:", res.status);
                return;
            }
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                console.error("[Wallpaper] Expected JSON but got:", contentType);
                return;
            }
            const data = await res.json();
            this.isSponsor = data.is_sponsor;
            this.config = data.config;

            if (this.isSponsor && this.config.mode === 'rotation') {
                await this.loadRotationList();
            }
        } catch (e) {
            console.error("[Wallpaper] Status check failed:", e);
        }
    },

    async loadRotationList() {
        const res = await fetch('/api/wallpaper/list');
        const data = await res.json();
        this.rotationList = data.files || [];
        this.startRotation();
    },

    applyWallpaper() {
        const bgImg = document.getElementById('wallpaper-image');
        const bgVid = document.getElementById('wallpaper-video');

        if (!bgImg || !bgVid) {
            // Create elements if missing (for first run)
            this.createBGElements();
            return this.applyWallpaper();
        }

        if (this.config.mode === 'solid') {
            bgVid.style.display = 'none';
            bgImg.style.display = 'block';
            bgImg.style.backgroundImage = 'none';
            bgImg.style.backgroundColor = this.config.current || '#000000';
        } else if (this.config.is_video) {
            bgImg.style.display = 'none';
            bgVid.style.display = 'block';
            bgVid.src = this.config.current;
            bgVid.play().catch(e => console.warn("Video autoplay blocked:", e));
        } else {
            bgVid.style.display = 'none';
            bgImg.style.display = 'block';
            bgImg.style.backgroundImage = `url('${this.config.current}')`;
            bgImg.style.backgroundColor = 'transparent';
        }
    },

    createBGElements() {
        if (!document.getElementById('wallpaper-image')) {
            const img = document.createElement('div');
            img.id = 'wallpaper-image';
            document.body.prepend(img);
        }
        if (!document.getElementById('wallpaper-video')) {
            const vid = document.createElement('video');
            vid.id = 'wallpaper-video';
            vid.muted = true;
            vid.loop = true;
            document.body.prepend(vid);
        }
    },

    renderUI() {
        const container = document.getElementById('p-wallpaper-content');
        if (!container) return;

        const premiumAttr = this.isSponsor ? '' : 'disabled style="opacity: 0.5"';

        container.innerHTML = `
            <div class="wallpaper-content">
                <div class="wp-preview-container" onclick="document.getElementById('wp-file-input').click()" title="Click to upload">
                    <div class="wp-preview" style="background-image: url('${this.config.current}')">
                        <div class="wp-preview-overlay">CHANGE IMAGE</div>
                    </div>
                </div>
                
                <div class="wp-options">
                    <div class="wp-row">
                        <span>Upload Background</span>
                        <input type="file" id="wp-file-input" style="display:none" multiple onchange="WallpaperManager.handleUpload(this)">
                        <button class="wp-browse-btn" onclick="document.getElementById('wp-file-input').click()">📁 BROWSE</button>
                    </div>

                    <div class="wp-row">
                        <span>Background List</span>
                        <button class="wp-browse-btn" style="background: linear-gradient(135deg, #8e44ad, #9b59b6); color: white; padding: 4px 12px; transform: none;" 
                                onclick="WallpaperManager.openGallery()">🖼️ GALLERY</button>
                    </div>
                    
                    <div class="wp-row" style="display: ${this.config.mode === 'solid' ? 'flex' : 'none'}">
                        <span>Color Pick</span>
                        <input type="color" class="wp-input" style="padding: 0; width: 60px; height: 30px; cursor: pointer;"
                               value="${(this.config.mode === 'solid' && this.config.current) ? this.config.current : '#000000'}" 
                               onchange="WallpaperManager.config.current = this.value; WallpaperManager.applyWallpaper();">
                    </div>

                    <div class="wp-row" style="display: ${this.config.mode === 'url' ? 'flex' : 'none'}; ${this.isSponsor ? '' : 'opacity: 0.5'}">
                        <span>Remote URL ${this.isSponsor ? '' : '💎'}</span>
                        <input type="text" class="wp-input" ${this.isSponsor ? '' : 'disabled'}
                               value="${this.config.mode === 'url' ? this.config.current : ''}" 
                               placeholder="http://..." onchange="WallpaperManager.config.current = this.value; WallpaperManager.config.is_video = this.value.toLowerCase().endsWith('.mp4') || this.value.toLowerCase().endsWith('.webm');">
                    </div>
                    
                    <div class="wp-row">
                        <span>Mode</span>
                        <select class="wp-input" onchange="WallpaperManager.config.mode = this.value; if(this.value==='solid') WallpaperManager.config.current='#000000'; WallpaperManager.renderUI()">
                            <option value="static" ${this.config.mode === 'static' ? 'selected' : ''}>STATIC</option>
                            <option value="solid" ${this.config.mode === 'solid' ? 'selected' : ''}>SOLID COLOR</option>
                            <option value="url" ${this.config.mode === 'url' ? 'selected' : ''} ${this.isSponsor ? '' : 'disabled'}>URL ${this.isSponsor ? '' : '💎'}</option>
                            <option value="rotation" ${this.config.mode === 'rotation' ? 'selected' : ''} ${this.isSponsor ? '' : 'disabled'}>ROTATION ${this.isSponsor ? '' : '💎'}</option>
                        </select>
                    </div>

                    <div class="wp-row" style="display: ${this.config.mode === 'rotation' ? 'flex' : 'none'}; ${this.isSponsor ? '' : 'opacity: 0.5'}">
                        <span>Interval (Sec)</span>
                        <input type="number" class="wp-input" ${this.isSponsor ? '' : 'disabled'}
                               value="${this.config.interval || 300}" min="10" step="10"
                               onchange="WallpaperManager.config.interval = parseInt(this.value, 10) || 300">
                    </div>

                    <button class="wp-save-btn" onclick="WallpaperManager.saveAll()">💾 SAVE SETTINGS</button>
                </div>
                
                <div class="wp-footer">
                    ${this.isSponsor ? 'Sponsor Account Active' : 'Sponsor to unlock MP4/URL/Rotation'}
                </div>
            </div>
        `;
    },

    async saveAll() {
        const btn = document.querySelector('.wp-save-btn');
        const originalText = btn.innerText;
        btn.innerText = "⌛ SAVING...";
        btn.disabled = true;

        try {
            await this.updateConfig({}); // 현재 config 상태로 서버 저장 강제 호출
            btn.innerText = "✅ SAVED!";
            btn.style.background = "linear-gradient(135deg, #2ecc71, #27ae60)";
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = "";
                btn.disabled = false;
            }, 2000);
        } catch (e) {
            btn.innerText = "❌ ERROR";
            setTimeout(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            }, 2000);
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
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/wallpaper/upload', {
                    method: 'POST',
                    body: formData
                });
                lastData = await res.json();
            }

            // 파일이 1개일 때만 즉시 적용, 그 외는 목록만 갱신
            if (input.files.length === 1 && lastData && lastData.status === 'success') {
                await this.updateConfig({
                    mode: 'static',
                    current: lastData.url,
                    is_video: lastData.is_video
                });
                btn.innerText = "✅ APPLIED!";
            } else {
                await this.refreshStatus();
                this.renderUI();
                btn.innerText = "✅ UPLOADED!";
            }

            setTimeout(() => {
                btn.innerText = originalText;
                btn.disabled = false;
            }, 2000);

        } catch (e) {
            alert("Upload failed: " + e);
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },

    async updateConfig(newVal) {
        this.config = { ...this.config, ...newVal };

        await fetch('/api/wallpaper/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.config)
        });

        if (this.config.mode === 'rotation') {
            await this.loadRotationList(); // 목록 새로고침 및 타이머(Interval) 재시작
        } else {
            this.stopRotation();
            this.applyWallpaper();
        }

        this.renderUI();
    },

    toggleRotation(val) {
        if (val === 'rotation') {
            this.loadRotationList();
        } else {
            this.stopRotation();
        }
        this.updateConfig({ mode: val });
    },

    startRotation() {
        this.stopRotation();
        let idx = 0;
        this.timer = setInterval(() => {
            if (this.rotationList.length === 0) return;
            idx = (idx + 1) % this.rotationList.length;
            const file = this.rotationList[idx];
            this.config.current = `/static/wallpaper/${file}`;
            this.config.is_video = file.toLowerCase().endsWith('.mp4');
            this.applyWallpaper();
        }, this.config.interval * 1000);
    },

    stopRotation() {
        if (this.timer) clearInterval(this.timer);
    },

    async openGallery() {
        const res = await fetch('/api/wallpaper/list');
        const data = await res.json();
        const files = data.files || [];

        let modal = document.getElementById('wp-gallery-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'wp-gallery-modal';
            modal.className = 'wp-gallery-modal';
            document.body.appendChild(modal);
        }

        let gridHtml = files.map(f => {
            const url = `/static/wallpaper/${f}`;
            const isVid = f.toLowerCase().endsWith('.mp4') || f.toLowerCase().endsWith('.webm');
            let content = '';

            if (isVid) {
                content = `<video src="${url}" class="wp-gallery-thumb" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
                           <div class="wp-thumb-badge">🎬 VID</div>`;
            } else {
                content = `<div class="wp-gallery-thumb" style="background-image: url('${url}')"></div>`;
            }
            return `<div class="wp-gallery-item" onclick="WallpaperManager.selectFromGallery('${url}', ${isVid})">
                        ${content}
                    </div>`;
        }).join('');

        if (files.length === 0) {
            gridHtml = '<div style="color: #aaa; padding: 20px; text-align: center; width: 100%;">No uploaded backgrounds yet. Please upload one first!</div>';
        }

        modal.innerHTML = `
            <div class="wp-gallery-overlay" onclick="WallpaperManager.closeGallery()"></div>
            <div class="wp-gallery-content">
                <div class="wp-gallery-header">
                    <h3>🖼️ Background Gallery</h3>
                    <button class="wp-gallery-close" onclick="WallpaperManager.closeGallery()">❌</button>
                </div>
                <div class="wp-gallery-grid">
                    ${gridHtml}
                </div>
            </div>
        `;

        // requestAnimationFrame으로 애니메이션 안정화
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    },

    closeGallery() {
        const modal = document.getElementById('wp-gallery-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    selectFromGallery(url, isVideo) {
        this.updateConfig({
            mode: 'static',
            current: url,
            is_video: isVideo
        });

        this.closeGallery();

        // 피드백 효과
        const btn = document.querySelector('.wp-save-btn');
        if (btn) {
            const originalText = btn.innerText;
            btn.innerText = "✅ APPLIED!";
            btn.style.background = "linear-gradient(135deg, #2ecc71, #27ae60)";
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = "";
            }, 2000);
        }
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => WallpaperManager.init());
