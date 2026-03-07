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

        // 1. [CRITICAL] 명령어 즉시 등록 (Asynchronous 지연 방지)
        const handleYTCommand = async (cmd) => {
            const parts = cmd.toLowerCase().split(' ');
            const action = parts[1]; // play, pause, next, list, load

            if (action === 'pause' || action === 'stop') {
                if (this.isReady) this.player.pauseVideo();
                context.appendLog('YOUTUBE', '⏸️ 일시 정지되었습니다.');
            } else if (action === 'play' || action === 'resume') {
                const playIdx = parseInt(parts[2]);
                if (!isNaN(playIdx)) {
                    // /yt play 1 과 같이 숫자가 들어온 경우 해당 목록 로드
                    const idx = playIdx - 1;
                    if (this.availablePlaylists && this.availablePlaylists[idx]) {
                        const pl = this.availablePlaylists[idx];
                        context.appendLog('YOUTUBE', `🔄 "${pl.title}" 로드 및 재생을 시작합니다.`);
                        const ok = await loadPlaylist(pl.playlistId);
                        if (ok && this.select) this.select.value = pl.playlistId;
                    } else {
                        context.appendLog('SYSTEM', '올바른 재생 목록 번호를 입력해 주세요.');
                    }
                } else {
                    if (this.playlist.length === 0) {
                        context.appendLog('SYSTEM', '현재 선택된 재생 목록이 없습니다. `/yt list` 후 `/yt load [번호]`를 입력해 주세요.');
                        return;
                    }
                    if (this.isReady) this.player.playVideo();
                    context.appendLog('YOUTUBE', '▶️ 재생을 시작합니다.');
                }
            } else if (action === 'next' || action === 'skip') {
                if (this.playlist.length === 0) {
                    context.appendLog('SYSTEM', '현재 선택된 재생 목록이 없습니다.');
                    return;
                }
                this.playNext();
                context.appendLog('YOUTUBE', '⏭️ 다음 곡으로 넘어갑니다.');
            } else if (action === 'list') {
                let listMsg = "🎵 **사용 가능한 플레이리스트:**\n";
                if (!this.availablePlaylists || this.availablePlaylists.length === 0) {
                    listMsg += "_데이터 로딩 중입니다... 잠시 후 다시 시도해 주세요._";
                } else {
                    this.availablePlaylists.forEach((pl, idx) => {
                        listMsg += `${idx + 1}. ${pl.title}\n`;
                    });
                    listMsg += "\n명령어: `/yt play [번호]` 로 바로 재생할 수 있습니다.";
                }
                context.appendLog('YOUTUBE', listMsg);
            } else if (action === 'load' || action === 'select') {
                const idx = parseInt(parts[2]) - 1;
                if (this.availablePlaylists && this.availablePlaylists[idx]) {
                    const pl = this.availablePlaylists[idx];
                    context.appendLog('YOUTUBE', `🔄 "${pl.title}" 재생 목록을 불러오는 중...`);
                    const ok = await loadPlaylist(pl.playlistId);
                    if (ok) {
                        context.appendLog('YOUTUBE', `✅ "${pl.title}" 로드 완료! 재생을 시작합니다.`);
                        if (this.select) this.select.value = pl.playlistId;
                    } else {
                        context.appendLog('ERROR', '❌ 플레이리스트 로드 실패');
                    }
                } else {
                    context.appendLog('SYSTEM', '올바른 번호를 입력해 주세요. (예: /yt load 1)');
                }
            } else {
                context.appendLog('SYSTEM', '사용법: /yt [play|pause|next|list|load <number>]');
            }
        };

        context.registerCommand('/yt', handleYTCommand);
        context.registerCommand('/youtube', handleYTCommand);
        context.registerCommand('/youtube-music', handleYTCommand);

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
