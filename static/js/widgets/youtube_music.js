/**
 * AEGIS YouTube Music Dedicated Widget
 * Modularized and Cleaned Version
 */

let ytPlayer = null;
let ytPlaylist = [];
let ytCurrentIndex = 0;
let ytIsReady = false;
let ytVolume = 0.3;

/**
 * Start the YouTube Music Widget
 */
async function startYouTubeMusic() {
    // console.log("[YT-Music] Initializing Widget...");

    // 1. Load IFrame API if needed
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } else if (window.YT.Player) {
        _createYTPlayer();
    }

    // 2. Load Initial Data
    await _loadPlaylists();
}

/**
 * Global callback for YT IFrame API
 */
window.onYouTubeIframeAPIReady = function () {
    _createYTPlayer();
};

/**
 * Internal: Create YT Player instance
 */
function _createYTPlayer() {
    if (ytPlayer) return;
    // console.log("[YT-Music] Creating Player with origin:", window.location.origin);

    ytPlayer = new YT.Player('yt-player-core', {
        height: '1',
        width: '1',
        videoId: '',
        playerVars: {
            'autoplay': 1,
            'controls': 0,
            'disablekb': 1,
            'fs': 0,
            'rel': 0,
            'showinfo': 0,
            'iv_load_policy': 3,
            'origin': window.location.origin,
            'enablejsapi': 1
        },
        events: {
            'onReady': (e) => {
                // console.log("[YT-Music] Player Ready");
                ytIsReady = true;
                ytPlayer.setVolume(ytVolume * 100);
            },
            'onStateChange': _onStateChange,
            'onError': _onPlayerError
        }
    });
}

/**
 * Internal: Handle player errors
 */
function _onPlayerError(event) {
    const errorCodes = {
        2: "Invalid Parameter",
        5: "HTML5 Player Error",
        100: "Video Not Found",
        101: "Embedded Playback Restricted",
        150: "Embedded Playback Restricted"
    };
    console.error("[YT-Music] Player Error:", event.data, errorCodes[event.data] || "Unknown");

    // Wait 2 seconds then try next track
    setTimeout(() => {
        playNextYT();
    }, 2000);
}

/**
 * Internal: Handle state changes
 */
function _onStateChange(event) {
    // 0: Ended, 1: Playing, 2: Paused, 3: Buffering, 5: Cued
    // console.log("[YT-Music] State Changed:", event.data);

    if (window.reactionEngine) {
        window.reactionEngine.checkAndTrigger('youtube', {
            state: event.data === 1 ? 'PLAYING' : (event.data === 2 ? 'PAUSED' : (event.data === 0 ? 'ENDED' : 'OTHER'))
        }, 0);
    }

    if (event.data === 0) {
        playNextYT();
    }
}

/**
 * Internal: Fetch playlist list from server
 */
async function _loadPlaylists() {
    try {
        const res = await fetch('/yt/playlists');
        const data = await res.json();
        const select = document.getElementById('yt-mode-select');
        if (select) {
            select.innerHTML = '<option value="">Select Playlist</option>';
            data.forEach(pl => {
                const opt = document.createElement('option');
                opt.value = pl.playlistId;
                opt.textContent = pl.title;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("[YT-Music] Failed to load playlists:", e);
    }
}

/**
 * Public: Change current playlist
 */
async function changeYTPlaylist(playlistId) {
    if (!playlistId) return;
    try {
        const res = await fetch(`/yt/playlist/${playlistId}`);
        const data = await res.json();
        ytPlaylist = data.tracks || [];
        ytCurrentIndex = 0;
        if (ytPlaylist.length > 0) _playTrack(0);
    } catch (e) {
        console.error("[YT-Music] Failed to load tracks:", e);
    }
}

/**
 * Internal: Play specific track from current playlist
 */
function _playTrack(index) {
    if (!ytPlaylist[index]) return;
    const track = ytPlaylist[index];

    if (ytPlayer && ytIsReady) {
        ytPlayer.loadVideoById(track.videoId);
        _updateUI(track);
    } else {
        setTimeout(() => _playTrack(index), 1000);
    }
}

/**
 * Public: Play next track
 */
function playNextYT() {
    if (ytPlaylist.length === 0) return;
    ytCurrentIndex = (ytCurrentIndex + 1) % ytPlaylist.length;
    _playTrack(ytCurrentIndex);
}

/**
 * Internal: Update Widget UI elements
 */
function _updateUI(track) {
    const titleEl = document.getElementById('yt-track-title');
    const artistEl = document.getElementById('yt-track-artist');
    const thumbEl = document.getElementById('yt-thumbnail');

    if (titleEl) titleEl.innerText = track.title;
    if (artistEl) artistEl.innerText = track.artist;
    if (thumbEl) {
        thumbEl.src = track.thumbnail;
        thumbEl.style.display = 'block';
    }
}

/**
 * Public: Toggle Play/Pause
 */
function toggleYTPlay(play) {
    if (!ytPlayer) return;
    if (play) ytPlayer.playVideo();
    else {
        ytPlayer.pauseVideo();
        if (typeof window.dispatchAvatarEvent === 'function') window.dispatchAvatarEvent('MUSIC_STOP');
    }
}

/**
 * Public: Set Volume
 */
function setYTVolume(val) {
    ytVolume = val / 100;
    if (ytPlayer && ytPlayer.setVolume) {
        ytPlayer.setVolume(val);
    }
}

// Global Exports
window.startYouTubeMusic = startYouTubeMusic;
window.changeYTPlaylist = changeYTPlaylist;
window.toggleYTPlay = toggleYTPlay;
window.setYTVolume = setYTVolume;
window.playNextYT = playNextYT;
