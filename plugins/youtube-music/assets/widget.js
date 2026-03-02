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
        context.log("YouTube Music Widget Initializing...");

        // 1. YouTube API 로드 대기
        await this.ensureYouTubeAPI();

        // 2. DOM 요소 참조
        const playerContainer = shadowRoot.getElementById('yt-player-core');
        const select = shadowRoot.getElementById('yt-mode-select');
        const titleEl = shadowRoot.getElementById('yt-track-title');
        const artistEl = shadowRoot.getElementById('yt-track-artist');
        const thumbEl = shadowRoot.getElementById('yt-thumbnail');
        const playBtn = shadowRoot.getElementById('yt-play-btn');
        const pauseBtn = shadowRoot.getElementById('yt-pause-btn');
        const nextBtn = shadowRoot.getElementById('yt-next-btn');
        const volSlider = shadowRoot.getElementById('yt-volume');

        // 3. 플레이어 생성
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
                'onStateChange': (e) => this.handleStateChange(e, context),
                'onError': (e) => this.handleError(e)
            }
        });

        // 4. 데이터 로드 (플레이리스트)
        try {
            const res = await fetch('/api/plugins/youtube-music/playlists');
            const data = await res.json();
            select.innerHTML = `<option value="">${context._t('widgets.yt_select')}</option>`;
            data.forEach(pl => {
                const opt = document.createElement('option');
                opt.value = pl.playlistId;
                opt.textContent = pl.title;
                select.appendChild(opt);
            });
        } catch (e) {
            context.log("Failed to load playlists.");
        }

        // 5. 이벤트 바인딩
        if (select) select.onchange = async (e) => {
            const playlistId = e.target.value;
            if (!playlistId) return;
            try {
                const res = await fetch(`/api/plugins/youtube-music/playlist/${playlistId}`);
                const data = await res.json();
                this.playlist = data.tracks || [];
                this.currentIndex = 0;
                if (this.playlist.length > 0) this.playTrack(0, titleEl, artistEl, thumbEl, context);
            } catch (err) {
                context.log("Failed to load tracks.");
            }
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
            this.playNext(titleEl, artistEl, thumbEl, context);
        };

        if (volSlider) volSlider.oninput = (e) => {
            this.volume = e.target.value / 100;
            if (this.isReady) this.player.setVolume(e.target.value);
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
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
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

    playTrack: function (index, titleEl, artistEl, thumbEl, context) {
        if (!this.playlist[index]) return;
        const track = this.playlist[index];

        if (this.player && this.isReady) {
            this.player.loadVideoById(track.videoId);
            titleEl.innerText = track.title;
            artistEl.innerText = track.artist;
            thumbEl.src = track.thumbnail;
            thumbEl.style.display = 'block';
            context.log("Playing: " + track.title);
        } else {
            setTimeout(() => this.playTrack(index, titleEl, artistEl, thumbEl, context), 1000);
        }
    },

    playNext: function (titleEl, artistEl, thumbEl, context) {
        if (this.playlist.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.playTrack(this.currentIndex, titleEl, artistEl, thumbEl, context);
    },

    handleStateChange: function (event, context) {
        // 0: Ended
        if (event.data === 0) {
            // 이 컴포넌트 내부에서 nextBtn을 직접 찾을 수 없으므로(init 스코프 밖) 
            // 실제 수동 호출 필요하나, 여기서는 편의상 전역 트리거 생략
        }
        context.triggerReaction('youtube', {
            state: event.data === 1 ? 'PLAYING' : (event.data === 2 ? 'PAUSED' : 'OTHER')
        }, 0);
    },

    handleError: function (event) {
        console.error("[Plugin-X] YT Error:", event.data);
    },

    destroy: function () {
        if (this.player) this.player.destroy();
        console.log("[Plugin-X] YouTube Music Widget Destroyed.");
    }
};
