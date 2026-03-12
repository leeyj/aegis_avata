import { AudioEngine } from './audio_engine.js';
import { BubbleRenderer } from './renderer.js';
import { InteractionHandler } from './interactor.js';
import { utils } from './utils.js';

/**
 * AEGIS Core Voice Widget (Modular v4.5)
 * Light entry point that orchestrates sub-modules.
 */
export default {
    audioEngine: null,
    renderer: null,
    interactor: null,
    queue: [],
    isSpeaking: false,

    init: async function (root, context) {
        if (window.AEGIS_TEST_MODE) console.log("[CoreVoice] Initializing Modular Engine.");
        this.context = context;
        
        this.audioEngine = new AudioEngine(context);
        this.renderer = new BubbleRenderer(root, context);
        this.interactor = new InteractionHandler(root, context);

        this.renderer.initVisualizer();
        this.interactor.init(() => this.stop());

        // Audio Activation (Autoplay Fix)
        const unlock = async () => {
            if (this.audioEngine.audioContext.state === 'suspended') {
                await this.audioEngine.audioContext.resume();
                if (window.AEGIS_TEST_MODE) console.log("[CoreVoice:TRACE] AudioContext resumed by user interaction.");
            }
            try {
                const silent = new Audio("data:audio/mpeg;base64,SUQzBAAAAAABAFRYWFhYAAAASAAAbGF2YzUyLjcyLjAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWG9yYmlzAAAAAABvcmJpcwAAAAAA");
                await silent.play();
            } catch (e) {}
            ['mousedown', 'touchstart', 'keydown'].forEach(ev => window.removeEventListener(ev, unlock));
        };
        ['mousedown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, unlock));

        this.audioEngine.onEnded = () => {
            if (window.AEGIS_TEST_MODE) console.log("[CoreVoice:TRACE] Playback ended instance trigger.");
            this.isSpeaking = false;
            this.renderer.hide();
            this.renderer.stopVisualization();
            this.processQueue();
        };

        context.on('SPEAK', (data) => {
            if (window.AEGIS_TEST_MODE) console.log("[CoreVoice:TRACE] Received SPEAK event from broker:", data);
            this.speak(data);
        });
        context.on('VOICE_STOP', () => {
            if (window.AEGIS_TEST_MODE) console.log("[CoreVoice:TRACE] Received VOICE_STOP event.");
            this.stop();
        });
    },

    speak: function (data) {
        if (!data || !data.text) return;
        if (window.AEGIS_TEST_MODE) console.log("[CoreVoice:TRACE] speak() called. Queue size before push:", this.queue.length);
        this.queue.push(data);
        if (!this.isSpeaking) {
            this.processQueue();
        } else {
            if (window.AEGIS_TEST_MODE) console.log("[CoreVoice:TRACE] Already speaking, added to queue.");
        }
    },

    processQueue: async function () {
        if (window.AEGIS_TEST_MODE) console.log(`[CoreVoice:TRACE] processQueue() called. Queue: ${this.queue.length}, isSpeaking: ${this.isSpeaking}`);
        if (this.queue.length === 0 || this.isSpeaking) return;
        
        this.isSpeaking = true;
        const item = this.queue.shift();
        const cleanText = utils.stripMarkdown(item.text);

        if (window.AEGIS_TEST_MODE) console.log(`[CoreVoice:TRACE] Processing item: "${cleanText.substring(0, 30)}..."`);
        this.renderer.show(item.text, item.type || item.visualType);

        if (!item.skip_tts) {
            const rawUrl = item.audioUrl || item.audio_url || `/api/plugins/core-voice/tts?text=${encodeURIComponent(cleanText)}`;
            const ttsUrl = this.context.resolve(rawUrl);
            
            if (window.AEGIS_TEST_MODE) console.log(`[CoreVoice] 🔊 Attempting to play:`, { rawUrl, ttsUrl });
            
            const analyser = this.audioEngine.getAnalyser();
            this.renderer.startVisualization(analyser);
            
            const success = await this.audioEngine.play(ttsUrl);
            if (!success) {
                if (window.AEGIS_TEST_MODE) console.error("[CoreVoice:TRACE] Playback failed. Moving to next in 1s...");
                setTimeout(() => {
                    this.isSpeaking = false;
                    this.renderer.hide();
                    this.processQueue();
                }, 1000);
            }
        } else {
            if (window.AEGIS_TEST_MODE) console.log("[CoreVoice:TRACE] skip_tts is true. Hiding in 5s...");
            setTimeout(() => {
                this.isSpeaking = false;
                this.renderer.hide();
                this.processQueue();
            }, 5000);
        }
    },

    stop: function () {
        this.audioEngine.stop();
        this.renderer.hide();
        this.renderer.stopVisualization();
        this.queue = [];
        this.isSpeaking = false;
    }
};
