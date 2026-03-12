/**
 * AEGIS Service Bridge
 * Handles early boot queues and global service proxies.
 */

// Private state within the module
const speakQueue = [];
const cmdQueue = [];
const cmdRegistry = new Map();

export const serviceBridge = {
    init: function () {
        // Initialize global speech hook
        window.speakTTS = (text, audioUrl, visualType, speechText) => {
            console.log("[ServiceBridge] Speak requested during early boot. Queueing...");
            speakQueue.push({ text, audioUrl, visualType, speechText });
            if (window.messageBroker) {
                window.messageBroker.broadcast('SPEAK', { text, audioUrl, visualType, speechText });
            }
        };

        // Initialize Command Router Proxy
        window.CommandRouter = {
            init: () => Promise.resolve(),
            route: (cmd, model) => {
                console.log("[CommandRouter] Command received during early boot. Queueing:", cmd);
                return new Promise((resolve) => {
                    cmdQueue.push({ cmd, model, resolve });
                });
            },
            register: (prefix, callback) => {
                cmdRegistry.set(prefix.toLowerCase(), callback);
            }
        };

        // Expose queues for initialization consumption
        window._aegis_speak_queue = speakQueue;
        window._aegis_cmd_queue = cmdQueue;
        window._aegis_cmd_registry = cmdRegistry;
    },

    getSpeakQueue: () => speakQueue,
    getCmdQueue: () => cmdQueue,
    getCmdRegistry: () => cmdRegistry,

    /**
     * Flush all pending queues and switch to live broker mode.
     */
    flush: function (broker) {
        console.log(`[ServiceBridge] Flushing queues: ${speakQueue.length} speak, ${cmdQueue.length} cmd.`);

        // 1. Process Speak Queue
        while (speakQueue.length > 0) {
            const item = speakQueue.shift();
            broker.send('core', 'SPEAK', item);
        }

        // 2. Process Command Queue
        while (cmdQueue.length > 0) {
            const { cmd, model, resolve } = cmdQueue.shift();
            broker.request('core', 'ROUTE_CMD', { cmd, model }).then(resolve);
        }

        // 3. Register Existing Commands
        cmdRegistry.forEach((callback, prefix) => {
            broker.send('core', 'REG_CMD', { prefix });
        });

        // 4. Switch global hooks to use broker directly
        window.speakTTS = (text, audioUrl, visualType, speechText) => {
            broker.send('core', 'SPEAK', { text, audioUrl, visualType, speechText });
        };

        window.CommandRouter.route = (cmd, model) => {
            return broker.request('core', 'ROUTE_CMD', { cmd, model });
        };

        console.log("[ServiceBridge] Transitioned to Live Broker Mode.");
    },

    clearSpeakQueue: () => {
        speakQueue.length = 0;
        delete window._aegis_speak_queue;
    },

    clearCmdQueue: () => {
        cmdQueue.length = 0;
        delete window._aegis_cmd_queue;
    },

    clearCmdRegistry: () => {
        cmdRegistry.clear();
        delete window._aegis_cmd_registry;
    }
};
