/**
 * AEGIS Plugin-X YouTube Music Widget (v1.0)
 */
export default {
    player: null,
    playlist: [],
    currentIndex: 0,
    isReady: false,
    volume: 0.3,

    init: async function (shadowRoot, context) {
        this.context = context;
        context.log("YouTube Music Widget Initializing...");

        // 1. [v3.8.8] Plugin-X: 범용 시스템 명령어 수신 (Terminal & Discord 통합)
        window.addEventListener('AEGIS_SYSTEM_COMMAND', async (e) => {
            const data = e.detail;
            if (data.command !== 'YOUTUBE_PLAY') return; // 자사 명령어가 아니면 무시

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

        // 2. YouTube API 로드 대기
        await this.ensureYouTubeAPI();

        // 3. DOM 요소 참조 및 멤버 저장
        const playerContainer = shadowRoot.getElementById('yt-player-core');
        this.select = shadowRoot.getElementById('yt-mode-select');
        this.titleEl = shadowRoot.getElementById('yt-track-title');
        this.artistEl = shadowRoot.getElementById('yt-track-artist');
        this.thumbEl = shadowRoot.getElementById('yt-thumbnail');

        const playBtn = shadowRoot.getElementById('yt-play-btn');
        const pauseBtn = shadowRoot.getElementById('yt-pause-btn');
        const nextBtn = shadowRoot.getElementById('yt-next-btn');
        const volSlider = shadowRoot.getElementById('yt-volume');
        const authBtn = shadowRoot.getElementById('yt-auth-btn');

        // 4. 플레이어 생성
        this.player = new YT.Player(playerContainer, {
            height: '1',
            width: '1',
            videoId: '',
            playerVars: {
                'autoplay': 1,
                'controls': 0,
                'disablekb': 1,
                'rel': 0,
                'origin': window.location.origin,
                'enablejsapi': 1
            },
            events: {
                'onReady': (e) => {
                    this.isReady = true;
                    this.player.setVolume(this.volume * 100);
                    context.log("YT Player Ready.");
                },
                'onStateChange': (e) => this.handleStateChange(e),
                'onError': (e) => this.handleError(e)
            }
        });

        // 5. 데이터 로드 (플레이리스트)
        this.availablePlaylists = [];
        try {
            const res = await fetch('/api/plugins/youtube-music/playlists');
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
                const res = await fetch(`/api/plugins/youtube-music/playlist/${playlistId}`);
                const data = await res.json();
                this.playlist = data.tracks || [];
                this.currentIndex = 0;
                if (this.playlist.length > 0) this.playTrack(0);
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
            e.stopPropagation();
            if (this.isReady) this.player.playVideo();
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
                    const res = await fetch('/api/plugins/youtube-music/auth', {
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
                const check = setInterval(() => {
                    if (window.YT && window.YT.Player) {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
            }
        });
    },

    playTrack: function (index) {
        if (!this.playlist[index]) return;
        const track = this.playlist[index];

        if (this.player && this.isReady) {
            this.player.loadVideoById(track.videoId);
            if (this.titleEl) this.titleEl.innerText = track.title;
            if (this.artistEl) this.artistEl.innerText = track.artist;
            if (this.thumbEl) {
                this.thumbEl.src = track.thumbnail;
                this.thumbEl.style.display = 'block';
            }
            if (this.context) this.context.log("Playing: " + track.title);
        } else {
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
