/**
 * AEGIS Core Voice - Bubble Renderer
 * Handles Speech Bubble UI and Visualizer bars.
 */
export class BubbleRenderer {
    constructor(root, context) {
        this.root = root;
        this.context = context;
        this.bubbleTimer = null;
        this.animationId = null;
        this.bars = [];
    }

    initVisualizer() {
        const container = this.root.querySelector('#visualizer-container');
        if (!container) return;
        container.innerHTML = '';
        this.bars = [];
        for (let i = 0; i < 20; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            bar.style.height = '5px';
            container.appendChild(bar);
            this.bars.push(bar);
        }
    }

    show(text, type) {
        const bubble = this.root.querySelector('#speech-bubble');
        const textEl = this.root.querySelector('#bubble-text');
        if (!bubble || !textEl) return;

        const iconMap = {
            'email': '📧',
            'system': '⚙️',
            'alert': '🚨',
            'error': '🔴'
        };
        const icon = iconMap[type] || '🤖';
        
        textEl.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 8px;">${icon}</div>
            <div style="font-weight: bold; font-size: 11px; color: #00f2ff; margin-bottom: 5px; opacity: 0.7;">[CLICK TO DISMISS]</div>
            ${text}
        `;

        bubble.style.display = 'block';
        bubble.style.opacity = '1';
        bubble.style.transform = 'translateY(0)';

        clearTimeout(this.bubbleTimer);
        this.bubbleTimer = setTimeout(() => this.hide(), 120000);
    }

    hide() {
        const bubble = this.root.querySelector('#speech-bubble');
        if (bubble) {
            bubble.style.opacity = '0';
            bubble.style.transform = 'translateY(10px)';
            setTimeout(() => { bubble.style.display = 'none'; }, 300);
        }
    }

    startVisualization(analyser) {
        if (!analyser) return;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const draw = () => {
            this.animationId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            for (let i = 0; i < 20; i++) {
                const value = dataArray[i] || 0;
                const height = (value / 255) * 40 + 5;
                if (this.bars[i]) {
                    this.bars[i].style.height = `${height}px`;
                    this.bars[i].style.opacity = 0.5 + (value / 255) * 0.5;
                }
            }
        };
        draw();
    }

    stopVisualization() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.bars.forEach(bar => { bar.style.height = '5px'; bar.style.opacity = '0.5'; });
    }
}
