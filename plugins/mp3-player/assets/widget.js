/**
 * Plugin-X MP3 Player (v1.0)
 * Uses Media Proxy and AI Gateway capabilities.
 */
export default {
    currentTrack: null,

    init: async function (shadowRoot, context) {
        context.log("MP3 Player Initialize...");

        const listContainer = shadowRoot.getElementById('mp3-list');
        const audio = shadowRoot.getElementById('mp3-audio');
        const info = shadowRoot.getElementById('mp3-info');
        const aiBtn = shadowRoot.getElementById('ai-analyze-btn');
        const aiRes = shadowRoot.getElementById('ai-result');

        // 1. 미디어 목록 가져오기 (Media Proxy 사용)
        try {
            const files = await context.getMediaList();
            if (files && files.length > 0) {
                listContainer.innerHTML = '';
                files.forEach(file => {
                    const item = document.createElement('div');
                    item.className = 'mp3-item';
                    item.textContent = file;
                    item.onclick = () => {
                        this.currentTrack = file;
                        this.playTrack(file, audio, info, context);
                    };
                    listContainer.appendChild(item);
                });
            } else {
                listContainer.textContent = 'No tracks found.';
            }
        } catch (e) {
            context.log("Error loading tracks: " + e.message);
            listContainer.textContent = 'Failed to load music.';
        }

        // 2. AI 분석 기능 (AI Gateway 사용)
        if (aiBtn) aiBtn.onclick = async () => {
            if (!this.currentTrack) {
                alert("Select a track first!");
                return;
            }
            aiRes.textContent = "AI Analyzing...";
            try {
                const result = await context.askAI("analyze_track", { filename: this.currentTrack });
                if (result.status === 'success') {
                    aiRes.textContent = result.result.briefing || "No briefing received.";
                } else {
                    aiRes.textContent = "AI Analysis Error: " + result.message;
                }
            } catch (e) {
                aiRes.textContent = "AI Request Failed.";
            }
        };

        // 3. 터미널 명령어 등록 (Plugin-X Architecture)
        const handleMP3Command = (cmd) => {
            const parts = cmd.toLowerCase().split(' ');
            const action = parts[1];

            if (action === 'stop' || action === 'pause') {
                audio.pause();
                context.appendLog('MP3', '⏹️ 재생을 중단합니다.');
            } else if (action === 'play') {
                audio.play();
                context.appendLog('MP3', '▶️ 재생을 다시 시작합니다.');
            } else {
                context.appendLog('SYSTEM', '사용법: /mp3 [play|stop]');
            }
        };

        context.registerCommand('/mp3', handleMP3Command);
        context.registerCommand('/mp3-player', handleMP3Command);
    },

    playTrack: function (file, audio, info, context) {
        context.log("Playing: " + file);
        const url = context.getAudioUrl(file);
        audio.src = url;
        audio.play();
        info.textContent = "Playing: " + file;
    },

    destroy: function () {
        console.log("[Plugin-X] MP3 Player Destroyed.");
    }
};
