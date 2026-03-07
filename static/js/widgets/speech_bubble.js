/**
 * AEGIS Global Speech Bubble (HUD) Widget
 * Responsibilities: Display text to the user globally.
 */

window.AEGIS_HUD = {
    speechBubble: null,
    bubbleText: null,

    init: function () {
        // Create the speech bubble wrapper
        this.speechBubble = document.createElement('div');
        this.speechBubble.id = 'speech-bubble';
        this.speechBubble.className = 'speech-bubble glass-panel';

        // Create the visualizer container
        const vizContainer = document.createElement('div');
        vizContainer.id = 'visualizer-container';
        vizContainer.className = 'visualizer-container';
        this.speechBubble.appendChild(vizContainer);

        // Create the bubble text element
        this.bubbleText = document.createElement('div');
        this.bubbleText.id = 'bubble-text';
        this.speechBubble.appendChild(this.bubbleText);

        // Append to UI layer
        const uiLayer = document.getElementById('ui-layer') || document.body;
        uiLayer.appendChild(this.speechBubble);

        // Initialize Audio Visualizer if available
        if (window.initAudioVisualizer && vizContainer) {
            window.initAudioVisualizer(vizContainer);
        }

        // Close on click
        this.speechBubble.addEventListener('click', (e) => {
            if (!this.hasMovedBubble) {
                this.hideBubble();
            }
        });

        this.initDragging();
    },

    showBubble: function (text, icon = '🤖') {
        if (!this.speechBubble) this.init();
        this.bubbleText.innerHTML = `<div style="font-size: 24px; margin-bottom: 8px;">${icon}</div>
                                     <div style="font-weight: bold; font-size: 13px; color: #00f2ff; margin-bottom: 5px;">[클릭하여 닫음]</div>
                                     ${text}`;
        this.speechBubble.style.display = 'block';
    },

    hideBubble: function () {
        if (this.speechBubble) this.speechBubble.style.display = 'none';
    },

    initDragging: function () {
        let isDraggingBubble = false;
        this.hasMovedBubble = false;
        let dragBubbleStartX, dragBubbleStartY;
        let initialBubbleLeft, initialBubbleTop;
        let scaleX = 1, scaleY = 1;

        this.speechBubble.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (e.offsetX > this.speechBubble.clientWidth - 15) return;
            if (e.offsetY > this.speechBubble.clientHeight - 15) return;

            isDraggingBubble = true;
            this.hasMovedBubble = false;
            dragBubbleStartX = e.clientX;
            dragBubbleStartY = e.clientY;

            const rect = this.speechBubble.getBoundingClientRect();
            scaleX = rect.width / this.speechBubble.offsetWidth || 1;
            scaleY = rect.height / this.speechBubble.offsetHeight || 1;

            const computedStyle = window.getComputedStyle(this.speechBubble);
            initialBubbleLeft = parseFloat(computedStyle.left) || this.speechBubble.offsetLeft;
            initialBubbleTop = parseFloat(computedStyle.top) || this.speechBubble.offsetTop;

            this.speechBubble.style.cursor = 'grabbing';
            this.speechBubble.style.transition = 'none';
            this.speechBubble.setPointerCapture(e.pointerId);
        });

        this.speechBubble.addEventListener('pointermove', (e) => {
            if (!isDraggingBubble) return;
            e.preventDefault();

            if (!this.hasMovedBubble) {
                if (Math.abs(e.clientX - dragBubbleStartX) > 5 || Math.abs(e.clientY - dragBubbleStartY) > 5) {
                    this.hasMovedBubble = true;
                } else {
                    return;
                }
            }

            const dx = (e.clientX - dragBubbleStartX) / scaleX;
            const dy = (e.clientY - dragBubbleStartY) / scaleY;

            this.speechBubble.style.left = (initialBubbleLeft + dx) + 'px';
            this.speechBubble.style.top = (initialBubbleTop + dy) + 'px';
            this.speechBubble.style.right = 'auto';
            this.speechBubble.style.bottom = 'auto';
        });

        this.speechBubble.addEventListener('pointerup', (e) => {
            if (isDraggingBubble) {
                isDraggingBubble = false;
                this.speechBubble.style.cursor = 'grab';
                this.speechBubble.style.transition = '';
                this.speechBubble.releasePointerCapture(e.pointerId);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.AEGIS_HUD.init();
});
