/**
 * AEGIS Core Voice & HUD Plugin
 * Unified Implementation of TTS, Speech Bubble, and Visualizer.
 */

export default {
    shadow: null,
    context: null,
    currentAudio: new Audio(),
    ttsQueue: [],
    isTtsPlaying: false,
    bubbleTimer: null,
    visualizer: {
        audioContext: null,
        analyser: null,
        dataArray: null,
        animationId: null,
        sourceNode: null,
        bars: []
    },

    init: async function (shadowRoot, context) {
        this.shadow = shadowRoot;
        this.context = context;
        this.context.log("Core Voice & HUD Initializing...");

        // 1. Initialize Visualizer Bars
        this.initVisualizer();

        // 2. Initialize Dragging for Speech Bubble
        this.initDragging();

        // 3. Register Global Hooks & Listeners
        window.speakTTS = (text, audioUrl, visualType, speechText) => {
            this.speak(text, audioUrl, visualType, speechText);
        };

        // System Event Listener for decouple communication
        window.addEventListener('aegis:speak', (e) => {
            const { text, audioUrl, visualType, speechText } = e.detail;
            this.speak(text, audioUrl, visualType, speechText);
        });

        // 4. Handle Pending Queue (if plugin_loader implemented queueing)
        if (window._aegis_speak_queue) {
            this.context.log(`Processing ${window._aegis_speak_queue.length} pending speak requests.`);
            window._aegis_speak_queue.forEach(item => this.speak(item.text, item.audioUrl, item.visualType, item.speechText));
            delete window._aegis_speak_queue;
        }

        this.context.log("Core Voice & HUD Ready.");
    },

    initVisualizer: function () {
        const container = this.shadow.getElementById('visualizer-container');
        if (!container) return;
        container.innerHTML = '';
        this.visualizer.bars = [];
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            bar.style.height = '5px';
            container.appendChild(bar);
            this.visualizer.bars.push(bar);
        }
    },

    initDragging: function () {
        const bubble = this.shadow.getElementById('speech-bubble');
        if (!bubble) return;

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        bubble.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const style = window.getComputedStyle(bubble);
            initialLeft = parseFloat(style.left);
            initialTop = parseFloat(style.top);
            bubble.setPointerCapture(e.pointerId);
            bubble.style.cursor = 'grabbing';
            bubble.style.transition = 'none';
        });

        bubble.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            bubble.style.left = `${initialLeft + dx}px`;
            bubble.style.top = `${initialTop + dy}px`;
        });

        bubble.addEventListener('pointerup', (e) => {
            isDragging = false;
            bubble.releasePointerCapture(e.pointerId);
            bubble.style.cursor = 'move';
            bubble.style.transition = '';
        });

        bubble.addEventListener('click', () => {
            // Click to close capability
            this.hideBubble();
            this.stopPlayback();
        });
    },

    speak: function (text, audioUrl, visualType, speechText) {
        if (!text) return;
        const cleanText = this.stripMarkdown(this.stripHtml(text));
        const finalSpeechText = speechText ? this.stripMarkdown(this.stripHtml(speechText)) : cleanText;

        this.ttsQueue.push({ text: cleanText, audioUrl, visualType, speechText: finalSpeechText });
        if (!this.isTtsPlaying) {
            this.processQueue();
        }
    },

    processQueue: async function () {
        if (this.ttsQueue.length === 0) {
            this.isTtsPlaying = false;
            return;
        }

        this.isTtsPlaying = true;
        const item = this.ttsQueue.shift();

        // 1. Show Bubble
        this.showBubble(item.text, item.visualType);

        // 2. Play Audio
        if (item.audioUrl) {
            this.playAudio(item.audioUrl);
        } else {
            try {
                // Request from backend (default provider handled by proactive-agent or core-voice router if extended)
                const res = await fetch('/api/plugins/proactive-agent/speak', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: item.speechText })
                });
                const data = await res.json();
                if (data.status === 'success' && data.url) {
                    this.playAudio(data.url);
                } else {
                    this.onPlaybackEnd();
                }
            } catch (e) {
                this.context.log("TTS Fetch Error:", e);
                this.onPlaybackEnd();
            }
        }
    },

    playAudio: function (url) {
        this.currentAudio.src = url;
        this.currentAudio.play().then(() => {
            this.startVisualization();
            window.dispatchEvent(new CustomEvent('aegis:avatar_action', { detail: { type: 'TTS_START' } }));
        }).catch(e => {
            this.context.log("Audio Play Error:", e);
            this.onPlaybackEnd();
        });

        this.currentAudio.onended = () => this.onPlaybackEnd();
    },

    stopPlayback: function () {
        this.currentAudio.pause();
        this.currentAudio.src = '';
        this.stopVisualization();
        window.dispatchEvent(new CustomEvent('aegis:avatar_action', { detail: { type: 'TTS_STOP' } }));
        this.isTtsPlaying = false;
        this.processQueue();
    },

    onPlaybackEnd: function () {
        this.stopVisualization();
        window.dispatchEvent(new CustomEvent('aegis:avatar_action', { detail: { type: 'TTS_STOP' } }));
        clearTimeout(this.bubbleTimer);
        this.bubbleTimer = setTimeout(() => this.hideBubble(), 2000);

        this.isTtsPlaying = false;
        setTimeout(() => this.processQueue(), 500);
    },

    showBubble: function (text, type) {
        const bubble = this.shadow.getElementById('speech-bubble');
        const textEl = this.shadow.getElementById('bubble-text');
        if (!bubble || !textEl) return;

        const icons = { 'email': '📧', 'system': '⚙️', 'alert': '🚨', 'error': '🔴', 'tactical': '🎯' };
        const icon = icons[type] || '🤖';

        textEl.innerHTML = `<div style="font-size: 24px; margin-bottom: 8px;">${icon}</div>
                           <div style="font-weight: bold; font-size: 11px; color: #00f2ff; margin-bottom: 5px; opacity: 0.7;">[CLICK TO DISMISS]</div>
                           ${text}`;

        bubble.style.display = 'block';
        clearTimeout(this.bubbleTimer);
        this.bubbleTimer = setTimeout(() => this.hideBubble(), 120000);
    },

    hideBubble: function () {
        const bubble = this.shadow.getElementById('speech-bubble');
        if (bubble) bubble.style.display = 'none';
    },

    startVisualization: function () {
        const audio = this.currentAudio;
        if (!this.visualizer.audioContext) {
            this.visualizer.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (!this.visualizer.sourceNode) {
            this.visualizer.sourceNode = this.visualizer.audioContext.createMediaElementSource(audio);
            this.visualizer.analyser = this.visualizer.audioContext.createAnalyser();
            this.visualizer.analyser.fftSize = 64;
            this.visualizer.sourceNode.connect(this.visualizer.analyser);
            this.visualizer.analyser.connect(this.visualizer.audioContext.destination);
        }

        const dataArray = new Uint8Array(this.visualizer.analyser.frequencyBinCount);
        const bars = this.visualizer.bars;

        const draw = () => {
            this.visualizer.animationId = requestAnimationFrame(draw);
            this.visualizer.analyser.getByteFrequencyData(dataArray);

            for (let i = 0; i < 20; i++) {
                const value = dataArray[i] || 0;
                const height = (value / 255) * 40 + 5;
                if (bars[i]) {
                    bars[i].style.height = `${height}px`;
                    bars[i].style.opacity = 0.5 + (value / 255) * 0.5;
                }
            }
        };

        if (this.visualizer.audioContext.state === 'suspended') {
            this.visualizer.audioContext.resume();
        }
        draw();
    },

    stopVisualization: function () {
        if (this.visualizer.animationId) {
            cancelAnimationFrame(this.visualizer.animationId);
        }
        this.visualizer.bars.forEach(bar => {
            bar.style.height = '5px';
            bar.style.opacity = '0.5';
        });
    },

    stripHtml: function (html) {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    },

    stripMarkdown: function (text) {
        if (!text) return "";
        return text.replace(/```[\s\S]*?```/g, '')
            .replace(/`{1,3}/g, '')
            .replace(/^[#*>\-]+\s+/gm, '')
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            .replace(/\[(RESPONSE|VOICE|DISPLAY|AI|ASSISTANT|SYSTEM)\]/gi, "")
            .trim();
    },

    destroy: function () {
        this.stopPlayback();
        if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
        window.speakTTS = null;
    }
};
