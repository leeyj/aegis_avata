import { SystemHandlers } from './handlers/system_handlers.js';
import { AiHandlers } from './handlers/ai_handlers.js';
import { UiHandlers } from './handlers/ui_handlers.js';
import { InteractionHandlers } from './handlers/interaction_handlers.js';

/**
 * AEGIS MessageBroker (v4.2 Modular)
 * Handles postMessage communication between Core and sandboxed widgets (Iframes).
 */
class MessageBroker {
    constructor() {
        this.widgets = new Map(); // id -> window
        this.listeners = new Map(); // type -> Set of callbacks
        this.pendingRequests = new Map(); // requestId -> { resolve, reject }
        this.externalHandlers = new Map(); // type -> callback (AsyncSupported)

        // [v4.2] Core handler registry (Modular Dispatcher)
        this.coreHandlers = {
            ...SystemHandlers,
            ...AiHandlers,
            ...UiHandlers,
            ...InteractionHandlers
        };

        window.addEventListener('message', this.handleMessage.bind(this));
        console.log("[MessageBroker] Initialized (v4.2 Modular)");
    }

    /**
     * Register a dynamic handler for specifically targeted requests (Plugin-X Bridge).
     * This allows external services to handle custom message types without modifying the core broker.
     */
    registerHandler(type, callback) {
        this.externalHandlers.set(type, callback);
    }

    /**
     * Register a widget's window or iframe for communication.
     */
    registerWidget(id, target) {
        this.widgets.set(id, target);
        console.log(`[MessageBroker] Widget registered: ${id}`);
    }

    /**
     * Send a message to a specific widget or 'core'.
     */
    send(targetId, type, data, requestId = null) {
        const message = {
            source: 'core',
            target: targetId,
            type: type,
            data: data,
            requestId: requestId,
            timestamp: Date.now()
        };

        if (targetId === 'core') {
            if (requestId && this.pendingRequests.has(requestId)) {
                const { resolve } = this.pendingRequests.get(requestId);
                this.pendingRequests.delete(requestId);
                resolve(data);
                return;
            }
            this._dispatch(message);
        } else {
            const widgetTarget = this.widgets.get(targetId);
            if (widgetTarget) {
                // If it's an iframe, dynamically get the current contentWindow to prevent stale references
                const targetWin = widgetTarget.contentWindow || widgetTarget;
                if (targetWin && typeof targetWin.postMessage === 'function') {
                    targetWin.postMessage(message, '*');
                }
            } else {
                console.warn(`[MessageBroker] Target widget not found: ${targetId}`);
            }
        }
    }

    /**
     * Send a message to all registered internal observers.
     * External widgets receive broadcasts only if they explicitly subscribed via 'LISTEN' intent.
     */
    broadcast(type, data) {
        // [v4.2.6] Dispatch to internal observers (which includes UiHandlers.LISTEN forwarders)
        const callbacks = this.listeners.get(type);
        if (callbacks) {
            if (window.AEGIS_TEST_MODE) console.log(`[MessageBroker] Broadcasting "${type}" to ${callbacks.size} internal listeners.`);
            callbacks.forEach(cb => cb(data, 'core', null));
        } else {
            if (window.AEGIS_TEST_MODE) console.log(`[MessageBroker] No internal listeners for broadcast type: "${type}"`);
        }
    }

    /**
     * Send a request and wait for a response (Promise).
     */
    request(targetId, type, data) {
        const requestId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Date.now().toString(36));
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });
            this.send(targetId, type, data, requestId);

            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error(`Request timeout: ${type} to ${targetId}`));
                }
            }, 5000);
        });
    }

    /**
     * Listen for messages of a specific type.
     */
    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(callback);
    }

    /**
     * Global listener for window.postMessage.
     */
    handleMessage(event) {
        const message = event.data;
        if (!message || typeof message !== 'object' || !message.type) return;

        if (message.requestId && this.pendingRequests.has(message.requestId)) {
            const { resolve } = this.pendingRequests.get(message.requestId);
            this.pendingRequests.delete(message.requestId);
            resolve(message.data);
            return;
        }

        this._dispatch(message);
    }

    async _dispatch(message) {
        // 1. External Handlers Check (Plugin-X dynamic bridge)
        if (message.target === 'core' && this.externalHandlers.has(message.type)) {
            try {
                const handler = this.externalHandlers.get(message.type);
                const result = await handler(message.data, message.source, message.requestId);
                if (message.requestId) {
                    this.send(message.source, message.type, result, message.requestId);
                }
                return;
            } catch (e) {
                console.error(`[MessageBroker] External handler error [${message.type}]:`, e);
                if (message.requestId) {
                    this.send(message.source, message.type, { status: 'error', message: e.message }, message.requestId);
                }
                return;
            }
        }

        // 2. [v4.2] Modular Core Handler Dispatch
        if (message.target === 'core') {
            const handler = this.coreHandlers[message.type];
            if (handler) {
                try {
                    const result = await handler(message.data, message.source, message.requestId, this);
                    
                    // Respond if requestId exists and result is NOT null (one-way events return null)
                    if (message.requestId && result !== null) {
                        this.send(message.source, message.type, result, message.requestId);
                    }
                } catch (e) {
                    console.error(`[MessageBroker] Core handler error [${message.type}]:`, e);
                    if (message.requestId) {
                        this.send(message.source, message.type, { status: 'error', message: e.message }, message.requestId);
                    }
                }
                return;
            }
        }

        // 3. Observer Dispatch (Internal Listeners)
        const callbacks = this.listeners.get(message.type);
        if (callbacks) {
            callbacks.forEach(cb => cb(message.data, message.source, message.requestId));
        }
    }
}

// Global instance for Core
window.messageBroker = new MessageBroker();
export default window.messageBroker;
