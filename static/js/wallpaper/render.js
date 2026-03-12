/**
 * AEGIS Wallpaper - Rendering Module (v1.6.8 Modularized)
 * Optimized for Plugin-X / Shadow DOM.
 */
window.WallpaperUI = {
    renderWidget(manager, root = document) {
        if (!root) root = document;
        const container = root.getElementById('p-wallpaper-content');
        if (!container) {
            console.warn("[Wallpaper] Target container 'p-wallpaper-content' not found.");
            return;
        }

        const { isSponsor, config } = manager;
        const bgStyle = config.mode === 'solid' ? `background-color: ${config.current}` : `background-image: url('${config.current}')`;

        container.innerHTML = `
            <div class="wallpaper-content">
                <style>
                    /* Shadow DOM 내부에 필요한 최소한의 구조적 스타일 주입 */
                    .wp-preview { height: 110px; border-radius: 8px; background-size: cover; background-position: center; position: relative; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); }
                    .wp-preview-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; font-size: 10px; font-weight: bold; }
                    .wp-preview:hover .wp-preview-overlay { opacity: 1; }
                    .wp-row { display: flex; justify-content: space-between; align-items: center; margin: 8px 0; font-size: 11px; }
                    .wp-input { background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); color: #0ff; font-family: 'Orbitron'; width: 100px; padding: 4px; border-radius: 4px; font-size: 10px; }
                    .wp-browse-btn, .wp-save-btn { border: 1px solid rgba(0,255,255,0.3); background: rgba(0,242,255,0.05); color: #0ff; font-family: 'Orbitron'; font-size: 10px; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
                </style>

                <div class="wp-preview" style="${bgStyle}" 
                     onclick="window.WallpaperManager.shadowRoot.getElementById('wp-file-input').click()" 
                     title="Click to change background">
                    <div class="wp-preview-overlay">CHANGE IMAGE</div>
                </div>
                
                <div class="wp-options">
                    <div class="wp-row">
                        <span>UPLOAD MEDIA</span>
                        <input type="file" id="wp-file-input" style="display:none" multiple 
                               onchange="window.WallpaperManager.handleUpload(this)">
                        <button class="wp-browse-btn" onclick="window.WallpaperManager.shadowRoot.getElementById('wp-file-input').click()">📁 BROWSE</button>
                    </div>

                    <div class="wp-row">
                        <span>COLLECTION</span>
                        <button class="wp-browse-btn" style="border-color: #f1c40f; color: #f1c40f;" 
                                onclick="window.WallpaperManager.openGallery()">🖼️ GALLERY</button>
                    </div>
                    
                    <div class="wp-row" style="display: ${config.mode === 'solid' ? 'flex' : 'none'}">
                        <span>COLOR PICK</span>
                        <input type="color" class="wp-input" style="height: 24px; cursor: pointer; width: 60px;"
                               value="${(config.mode === 'solid' && config.current) ? config.current : '#000000'}" 
                               onchange="window.WallpaperManager.updateConfig({ current: this.value })">
                    </div>

                    <div class="wp-row" style="display: ${config.mode === 'url' ? 'flex' : 'none'}; ${isSponsor ? '' : 'opacity: 0.5'}">
                        <span>REMOTE URL ${isSponsor ? '' : '💎'}</span>
                        <input type="text" class="wp-input" ${isSponsor ? '' : 'disabled'}
                               value="${config.mode === 'url' ? config.current : ''}" 
                               placeholder="http://..." onchange="window.WallpaperManager.handleURLChange(this.value)">
                    </div>
                    
                    <div class="wp-row">
                        <span>CORE MODE</span>
                        <select class="wp-input" onchange="window.WallpaperManager.handleModeChange(this.value)">
                            <option value="static" ${config.mode === 'static' ? 'selected' : ''}>STATIC</option>
                            <option value="solid" ${config.mode === 'solid' ? 'selected' : ''}>SOLID COLOR</option>
                            <option value="url" ${config.mode === 'url' ? 'selected' : ''} ${isSponsor ? '' : 'disabled'}>URL ${isSponsor ? '' : '💎'}</option>
                            <option value="rotation" ${config.mode === 'rotation' ? 'selected' : ''} ${isSponsor ? '' : 'disabled'}>ROTATION ${isSponsor ? '' : '💎'}</option>
                        </select>
                    </div>

                    <div class="wp-row" style="display: ${config.mode === 'rotation' ? 'flex' : 'none'}; ${isSponsor ? '' : 'opacity: 0.5'}">
                        <span>INTERVAL(s)</span>
                        <input type="number" class="wp-input" ${isSponsor ? '' : 'disabled'}
                               value="${config.interval || 300}" min="10" step="10"
                               onchange="window.WallpaperManager.updateConfig({ interval: parseInt(this.value, 10) || 300 })">
                    </div>

                    <button class="wp-save-btn" style="width: 100%; margin-top: 10px; border-color: #0ff;" 
                            onclick="window.WallpaperManager.saveRequested()">💾 SAVE SYNC</button>
                </div>
            </div>
        `;
    },

    createBGElements() {
        if (!document.getElementById('wallpaper-image')) {
            const img = document.createElement('div');
            img.id = 'wallpaper-image';
            img.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:-1000; pointer-events:none; background-size:cover; background-position:center;";
            document.body.prepend(img);
        }
        if (!document.getElementById('wallpaper-video')) {
            const vid = document.createElement('video');
            vid.id = 'wallpaper-video';
            vid.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:-1000; pointer-events:none; object-fit:cover; display:none;";
            vid.muted = true;
            vid.loop = true;
            vid.playsinline = true;
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

        console.log("[Wallpaper] Applying:", config.mode, config.current);

        if (config.mode === 'solid') {
            bgVid.style.display = 'none';
            bgImg.style.display = 'block';
            bgImg.style.backgroundImage = 'none';
            bgImg.style.backgroundColor = config.current || '#000000';
        } else if (config.is_video) {
            bgImg.style.display = 'none';
            bgVid.style.display = 'block';
            if (bgVid.src !== config.current) {
                bgVid.src = config.current;
                bgVid.load();
            }
            bgVid.play().catch(e => console.warn("Video autoplay blocked:", e));
        } else {
            bgVid.style.display = 'none';
            bgImg.style.display = 'block';
            const url = config.current || '';
            bgImg.style.backgroundImage = url ? `url('${url}')` : 'none';
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
            return `<div class="wp-gallery-item" onclick="window.WallpaperManager.selectFromGallery('${url}', ${isVid})">${content}</div>`;
        }).join('');

        if (files.length === 0) gridHtml = '<div style="color: #aaa; padding: 20px; text-align: center; width:100%;">No backgrounds yet. Upload one!</div>';

        modal.innerHTML = `
            <style>
                .wp-gallery-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 10000; display: none; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; }
                .wp-gallery-modal.active { display: flex; opacity: 1; }
                .wp-gallery-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); }
                .wp-gallery-content { position: relative; background: #0a0a0c; border: 1px solid #0ff; border-radius: 8px; width: 90%; max-width: 900px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
                .wp-gallery-header { padding: 15px; border-bottom: 1px solid rgba(0,255,255,0.2); display: flex; justify-content: space-between; }
                .wp-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; padding: 20px; overflow-y: auto; }
                .wp-gallery-item { aspect-ratio: 16/9; background: #000; border-radius: 4px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: 0.2s; position: relative; }
                .wp-gallery-item:hover { border-color: #0ff; transform: scale(1.02); }
                .wp-gallery-thumb { width:100%; height:100%; object-fit: cover; background-size: cover; background-position: center; }
            </style>
            <div class="wp-gallery-overlay" onclick="window.WallpaperManager.closeGallery()"></div>
            <div class="wp-gallery-content">
                <div class="wp-gallery-header">
                    <h3 style="margin:0; color: #0ff; font-family:'Orbitron';">BCE-01: BACKGROUND REPOSITORY</h3>
                    <button style="background:none; border:none; color:#0ff; cursor:pointer;" onclick="window.WallpaperManager.closeGallery()">[ CLOSE ]</button>
                </div>
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
