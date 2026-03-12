/**
 * AEGIS Plugin-X YouTube Music Widget (v1.0)
 */
export default {
    player: null,
    playlist: [],
    currentIndex: 0,
    isReady: false,
    volume: 0.3,
    isInitialLoad: true,

    init: async function (root, context) {
        this.context = context;
        context.log("YouTube Music Widget Initializing...");

        // 1. [v3.8.8] Plugin-X: 범용 시스템 명령어 수신 (Terminal & Discord 통합)
        // 1. [v4.1.0] Phase 2: System Command Integration (context.onSystemEvent)
        context.onSystemEvent('YOUTUBE_PLAY', (data) => {
            if (data.tracks) {
                this.playlist = data.tracks;
                this.currentIndex = 0;
            } else if (data.videoId) {
                this.playlist = [{
                    videoId: data.videoId,
                    title: data.title,
                    artist: data.artist
                }];
                this.currentIndex = 0;
            }

            if (this.playlist.length > 0) {
                this.playTrack(0);
                if (this.select && data.playlistId) this.select.value = data.playlistId;
            }
        });

        context.onSystemEvent('MUSIC_PAUSE', () => {
            if (this.isReady && this.player) {
                this.player.pauseVideo();
                context.log("Paused via system command.");
            }
        });

        context.onSystemEvent('MUSIC_NEXT', () => {
            if (this.isReady) {
                this.playNext();
                context.log("Next track via system command.");
            }
        });

        // 2. YouTube API 로드 대기
        await this.ensureYouTubeAPI();

        // 3. DOM 요소 참조 및 멤버 저장
        const playerContainer = root.getElementById('yt-player-core');
        if (playerContainer) {
            playerContainer.style.position = 'absolute';
            playerContainer.style.bottom = '10px';
            playerContainer.style.right = '10px';
            playerContainer.style.width = '200px';   // [v4.1.4] Higher size to satisfy all YT requirements
            playerContainer.style.height = '200px';
            playerContainer.style.pointerEvents = 'none';
            playerContainer.style.opacity = '0.1';   // [v4.1.4] Required visibility threshold
            playerContainer.style.zIndex = '0';
        }
        this.select = root.getElementById('yt-mode-select');
        this.titleEl = root.getElementById('yt-track-title');
        this.artistEl = root.getElementById('yt-track-artist');
        this.thumbEl = root.getElementById('yt-thumbnail');

        const playBtn = root.getElementById('yt-play-btn');
        const pauseBtn = root.getElementById('yt-pause-btn');
        const nextBtn = root.getElementById('yt-next-btn');
        const volSlider = root.getElementById('yt-volume');
        const authBtn = root.getElementById('yt-auth-btn');

        // 4. 플레이어 생성
        const currentOrigin = window.ORIGIN || (window.location.protocol + "//" + window.location.host);
        
        console.log(`[YT_WIDGET] Initializing Player with Origin: ${currentOrigin}`);

        this.player = new YT.Player(playerContainer, {
            height: '100%',
            width: '100%',
            playerVars: {
                'autoplay': 0,
                'controls': 0,
                'disablekb': 1,
                'rel': 0,
                'origin': currentOrigin,
                'enablejsapi': 1
                // widget_referrer removed for better compatibility with srcdoc
            },
            events: {
                'onReady': (e) => {
                    this.isReady = true;
                    this.player.setVolume(this.volume * 100);
                    console.log("[YT_WIDGET] Player Ready.");
                    context.log("YT Player Ready.");
                },
                'onStateChange': (e) => this.handleStateChange(e),
                'onError': (e) => this.handleError(e)
            }
        });

        // 5. 데이터 로드 (플레이리스트)
        this.availablePlaylists = [];
        try {
            const res = await context.fetch('playlists');
            const data = await res.json();
            this.availablePlaylists = data;
            if (this.select) {
                this.select.innerHTML = `<option value="">${context._t('widgets.yt_select')}</option>`;
                data.forEach((pl, idx) => {
                    const opt = document.createElement('option');
                    opt.value = pl.playlistId;
                    opt.textContent = pl.title;
                    this.select.appendChild(opt);
                });
            }
        } catch (e) {
            context.log("Failed to load playlists.");
        }

        const loadPlaylist = async (playlistId) => {
            try {
                const res = await context.fetch(`playlist/${playlistId}`);
                const data = await res.json();
                this.playlist = data.tracks || [];
                this.currentIndex = 0;
                console.log(`[YT_WIDGET] Playlist loaded: ${this.playlist.length} tracks.`);
                if (this.playlist.length > 0) {
                    console.log("[YT_WIDGET] Auto-cueing/loading first track...");
                    this.playTrack(0);
                }
                return true;
            } catch (err) {
                context.log("Failed to load tracks.");
                return false;
            }
        };

        // 6. 이벤트 바인딩
        if (this.select) this.select.onchange = async (e) => {
            const playlistId = e.target.value;
            if (!playlistId) return;
            await loadPlaylist(playlistId);
        };

        if (playBtn) playBtn.onclick = (e) => {
            console.log("[YT_WIDGET] Play clicked.");
            e.stopPropagation();
            if (this.isReady && this.player) {
                const state = this.player.getPlayerState();
                console.log(`[YT_WIDGET] Current State: ${state}`);
                if (state === 5 || state === -1 || state === 0) {
                    // Cued, Unstarted, or Ended -> Load first track if possible
                    if (this.playlist.length > 0) {
                        this.playTrack(this.currentIndex);
                    }
                }
                this.player.playVideo();
                console.log("[YT_WIDGET] playVideo() called.");
            } else {
                console.warn("[YT_WIDGET] Player not ready.");
            }
        };
        if (pauseBtn) pauseBtn.onclick = (e) => {
            e.stopPropagation();
            if (this.isReady) this.player.pauseVideo();
        };
        if (nextBtn) nextBtn.onclick = (e) => {
            e.stopPropagation();
            this.playNext();
        };

        if (volSlider) volSlider.oninput = (e) => {
            this.volume = e.target.value / 100;
            if (this.isReady) this.player.setVolume(e.target.value);
        };

        if (authBtn) authBtn.onclick = async (e) => {
            const raw = prompt(context._t('widgets.yt_auth_prompt'));
            if (raw) {
                try {
                    const res = await context.fetch('auth', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ raw_auth: raw })
                    });
                    const result = await res.json();

                    if (result.status === 'success') {
                        alert(context._t('widgets.yt_auth_success'));
                        location.reload();
                    } else {
                        alert(result.message);
                    }
                } catch (err) {
                    alert('Error: ' + err);
                }
            }
        };
    },

    ensureYouTubeAPI: function () {
        return new Promise((resolve) => {
            if (window.YT && window.YT.Player) {
                resolve();
            } else {
                if (!document.getElementById('yt-api-script')) {
                    const tag = document.createElement('script');
                    tag.id = 'yt-api-script';
                    tag.src = "https://www.youtube.com/iframe_api";
                    const firstScriptTag = document.getElementsByTagName('script')[0];
                    if (firstScriptTag) {
                        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                    } else {
                        document.head.appendChild(tag);
                    }
                }
                console.log("[YT_WIDGET] Waiting for YouTube API...");
                const check = setInterval(() => {
                    if (window.YT && window.YT.Player) {
                        clearInterval(check);
                        console.log("[YT_WIDGET] YouTube API Detected.");
                        resolve();
                    }
                }, 100);
            }
        });
    },

    retryCount: 0,
    playTrack: function (index) {
        if (!this.playlist[index]) return;
        const track = this.playlist[index];
        const vId = (track.videoId || track.id || "").trim();

        console.log(`[YT_WIDGET] playTrack(${index}) | vId: ${vId} | Ready: ${this.isReady} | Initial: ${this.isInitialLoad}`);

        if (!vId || vId.length !== 11) {
            console.error("[YT_WIDGET] Invalid Video ID:", vId);
            return;
        }

        if (this.player && this.isReady && typeof this.player.loadVideoById === 'function') {
            this.retryCount = 0;
            try {
                if (this.isInitialLoad) {
                    console.log("[YT_WIDGET] Cueing track...");
                    this.player.cueVideoById({ videoId: vId });
                    this.isInitialLoad = false;
                } else {
                    console.log("[YT_WIDGET] Loading track...");
                    this.player.loadVideoById({ videoId: vId });
                }
            } catch (err) {
                console.error("[YT_WIDGET] API Call failed:", err);
            }
            if (this.titleEl) this.titleEl.innerText = track.title;
            if (this.artistEl) this.artistEl.innerText = track.artist;
            if (this.thumbEl) {
                this.thumbEl.src = track.thumbnail;
                this.thumbEl.style.display = 'block';
            }
            if (this.context) this.context.log("Loaded: " + track.title);
        } else {
            this.retryCount++;
            if (this.retryCount > 60) {
                console.error("[YT_WIDGET] Player failed to become ready after 60s.");
                if (this.context) this.context.log("Player error: Not ready.");
                return;
            }
            console.log(`[YT_WIDGET] Player not ready, retrying (${this.retryCount}/60)...`);
            setTimeout(() => this.playTrack(index), 1000);
        }
    },

    playNext: function () {
        if (this.playlist.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.playTrack(this.currentIndex);
    },

    handleStateChange: function (event) {
        // 0: Ended
        if (event.data === 0) {
            if (this.context) this.context.log("Track ended. Moving to next...");
            this.playNext();
        }

        if (this.context) {
            this.context.triggerReaction('youtube', {
                state: event.data === 1 ? 'PLAYING' : (event.data === 2 ? 'PAUSED' : 'OTHER')
            }, 0);
        }
    },

    handleError: function (event) {
        console.error("[Plugin-X] YT Error:", event.data);
    },

    destroy: function () {
        if (this.player) this.player.destroy();
        console.log("[Plugin-X] YouTube Music Widget Destroyed.");
    }
};
