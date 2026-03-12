/**
 * AEGIS Core Voice - Audio Engine
 * Handles AudioContext, MediaStream, and TTS playback.
 */
export class AudioEngine {
    constructor(context) {
        this.context = context;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.currentSource = null;
        this.onEnded = null;
        this.isStopping = false;
    }

    getAnalyser() {
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 64;
        return analyser;
    }

    async play(url, onStart) {
        try {
            this.isStopping = false;
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const response = await fetch(url);
            if (!response.ok) {
                console.error(`[AudioEngine] ❌ Fetch failed (Status: ${response.status}) for ${url}`);
                return false;
            }

            const arrayBuffer = await response.arrayBuffer();
            if (arrayBuffer.byteLength === 0) {
                console.error(`[AudioEngine] ❌ Received empty audio data for ${url}`);
                return false;
            }

            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer).catch(err => {
                console.error(`[AudioEngine] ❌ Decoding failed:`, err);
                return null;
            });

            if (!audioBuffer || this.isStopping) return false;

            if (this.currentSource) {
                this.currentSource.stop();
            }

            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;

            const analyser = this.getAnalyser();
            source.connect(analyser);
            analyser.connect(this.audioContext.destination);

            source.onended = () => {
                if (!this.isStopping && this.onEnded) this.onEnded();
            };

            source.start(0);
            this.currentSource = source;
            if (onStart) onStart(analyser);
            if (window.AEGIS_TEST_MODE) console.log(`[AudioEngine] 🔊 Playing: ${url.split('/').pop()}`);
            return true;
        } catch (e) {
            console.error(`[AudioEngine] ❌ Play failed for ${url}:`, e);
            // [Autoplay Fix] 에러가 NotAllowedError인 경우 사용자 안내 필요 가능성
            if (e.name === 'NotAllowedError') {
                console.warn("[AudioEngine] Playback blocked by browser policy. Interaction required.");
            }
            return false;
        }
    }

    stop() {
        this.isStopping = true;
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {}
            this.currentSource = null;
        }
    }
}
