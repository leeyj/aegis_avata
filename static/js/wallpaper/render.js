/**
 * AEGIS Wallpaper - Rendering Module
 */
window.WallpaperUI = {
    renderWidget(manager) {
        const container = document.getElementById('p-wallpaper-content');
        if (!container) return;

        const { isSponsor, config } = manager;
        const premiumAttr = isSponsor ? '' : 'disabled style="opacity: 0.5"';

        container.innerHTML = `
            <div class="wallpaper-content">
                <div class="wp-preview-container" onclick="document.getElementById('wp-file-input').click()" title="Click to upload">
                    <div class="wp-preview" style="background-image: url('${config.current}')">
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
                    
                    <div class="wp-row" style="display: ${config.mode === 'solid' ? 'flex' : 'none'}">
                        <span>Color Pick</span>
                        <input type="color" class="wp-input" style="padding: 0; width: 60px; height: 30px; cursor: pointer;"
                               value="${(config.mode === 'solid' && config.current) ? config.current : '#000000'}" 
                               onchange="WallpaperManager.updateConfig({ current: this.value })">
                    </div>

                    <div class="wp-row" style="display: ${config.mode === 'url' ? 'flex' : 'none'}; ${isSponsor ? '' : 'opacity: 0.5'}">
                        <span>Remote URL ${isSponsor ? '' : '💎'}</span>
                        <input type="text" class="wp-input" ${isSponsor ? '' : 'disabled'}
                               value="${config.mode === 'url' ? config.current : ''}" 
                               placeholder="http://..." onchange="WallpaperManager.handleURLChange(this.value)">
                    </div>
                    
                    <div class="wp-row">
                        <span>Mode</span>
                        <select class="wp-input" onchange="WallpaperManager.handleModeChange(this.value)">
                            <option value="static" ${config.mode === 'static' ? 'selected' : ''}>STATIC</option>
                            <option value="solid" ${config.mode === 'solid' ? 'selected' : ''}>SOLID COLOR</option>
                            <option value="url" ${config.mode === 'url' ? 'selected' : ''} ${isSponsor ? '' : 'disabled'}>URL ${isSponsor ? '' : '💎'}</option>
                            <option value="rotation" ${config.mode === 'rotation' ? 'selected' : ''} ${isSponsor ? '' : 'disabled'}>ROTATION ${isSponsor ? '' : '💎'}</option>
                        </select>
                    </div>

                    <div class="wp-row" style="display: ${config.mode === 'rotation' ? 'flex' : 'none'}; ${isSponsor ? '' : 'opacity: 0.5'}">
                        <span>Interval (Sec)</span>
                        <input type="number" class="wp-input" ${isSponsor ? '' : 'disabled'}
                               value="${config.interval || 300}" min="10" step="10"
                               onchange="WallpaperManager.updateConfig({ interval: parseInt(this.value, 10) || 300 })">
                    </div>

                    <button class="wp-save-btn" onclick="WallpaperManager.saveRequested()">💾 SAVE SETTINGS</button>
                </div>
                
                <div class="wp-footer">
                    ${isSponsor ? 'Sponsor Account Active' : 'Sponsor to unlock MP4/URL/Rotation'}
                </div>
            </div>
        `;
    },

    createBGElements() {
        if (!document.getElementById('wallpaper-image')) {
            const img = document.createElement('div');
            img.id = 'wallpaper-image';
            img.className = 'weather-bg'; // Ensure it has base positioning or similar
            document.body.prepend(img);
        }
        if (!document.getElementById('wallpaper-video')) {
            const vid = document.createElement('video');
            vid.id = 'wallpaper-video';
            vid.muted = true;
            vid.loop = true;
            vid.playsinline = true; // Use playsinline for iOS support
            document.body.prepend(vid);
        }
    },

    applyWallpaper(config) {
        const bgImg = document.getElementById('wallpaper-image');
        const bgVid = document.getElementById('wallpaper-video');
        if (!bgImg || !bgVid) {
            this.createBGElements();
            return this.applyWallpaper(config);
        }

        if (config.mode === 'solid') {
            bgVid.style.display = 'none';
            bgImg.style.display = 'block';
            bgImg.style.backgroundImage = 'none';
            bgImg.style.backgroundColor = config.current || '#000000';
        } else if (config.is_video) {
            bgImg.style.display = 'none';
            bgVid.style.display = 'block';
            bgVid.src = config.current;
            bgVid.play().catch(e => console.warn("Video autoplay blocked:", e));
        } else {
            bgVid.style.display = 'none';
            bgImg.style.display = 'block';
            bgImg.style.backgroundImage = `url('${config.current}')`;
            bgImg.style.backgroundColor = 'transparent';
        }
    },

    async openGallery(files) {
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
            let content = isVid ? `<video src="${url}" class="wp-gallery-thumb" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video><div class="wp-thumb-badge">🎬 VID</div>` : `<div class="wp-gallery-thumb" style="background-image: url('${url}')"></div>`;
            return `<div class="wp-gallery-item" onclick="WallpaperManager.selectFromGallery('${url}', ${isVid})">${content}</div>`;
        }).join('');

        if (files.length === 0) gridHtml = '<div style="color: #aaa; padding: 20px; text-align: center; width:100%;">No backgrounds yet. Upload one!</div>';

        modal.innerHTML = `
            <div class="wp-gallery-overlay" onclick="WallpaperManager.closeGallery()"></div>
            <div class="wp-gallery-content">
                <div class="wp-gallery-header"><h3>🖼️ Background Gallery</h3><button class="wp-gallery-close" onclick="WallpaperManager.closeGallery()">❌</button></div>
                <div class="wp-gallery-grid">${gridHtml}</div>
            </div>
        `;
        requestAnimationFrame(() => modal.classList.add('active'));
    },

    closeGallery() {
        const modal = document.getElementById('wp-gallery-modal');
        if (modal) modal.classList.remove('active');
    }
};
