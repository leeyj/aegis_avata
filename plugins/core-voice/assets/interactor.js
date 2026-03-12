/**
 * AEGIS Core Voice - Interaction Handler
 * Handles user gestures and manual dismissals.
 */
export class InteractionHandler {
    constructor(root, context) {
        this.root = root;
        this.context = context;
    }

    init(onClose) {
        const bubble = this.root.querySelector('#speech-bubble');
        if (bubble) {
            bubble.addEventListener('click', () => {
                if (onClose) onClose();
            });
        }
    }
}
