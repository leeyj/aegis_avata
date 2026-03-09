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
            window.dispatchEvent(new CustomEvent('aegis:speak_queued', {
                detail: { text, audioUrl, visualType, speechText }
            }));
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
