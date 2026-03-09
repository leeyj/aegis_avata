/**
 * AEGIS Core Bridge Plugin
 * Migrated Unified Command Router & AI Gateway.
 */

export default {
    context: null,
    aliases: {},
    registry: new Map(),

    init: async function (shadow, context) {
        this.context = context;
        this.context.log("Core Bridge Initializing...");

        // 1. Sync Aliases
        try {
            const res = await fetch(`/api/plugins/aliases?t=${Date.now()}`);
            if (res.ok) {
                this.aliases = await res.json();
            }
        } catch (e) {
            this.context.log("Alias sync failed.");
        }

        // 2. Transfer from Proxy Registry (if any plugins registered before this loaded)
        if (window._aegis_cmd_registry) {
            for (const [prefix, cb] of window._aegis_cmd_registry.entries()) {
                this.registry.set(prefix, cb);
            }
            delete window._aegis_cmd_registry;
        }

        // 3. Replace Global Proxy with Real Implementation
        const realRouter = {
            aliases: this.aliases,
            registry: this.registry,
            init: () => Promise.resolve(), // Already initialized
            register: (p, c) => this.registry.set(p.toLowerCase(), c),
            route: (c, m) => this.route(c, m),
            processAIQuery: (c, m) => this.processAIQuery(c, m),
            showHelp: (c) => this.showHelp(c)
        };

        window.CommandRouter = realRouter;

        // 4. Process Queued Commands
        if (window._aegis_cmd_queue) {
            this.context.log(`Processing ${window._aegis_cmd_queue.length} queued commands.`);
            for (const item of window._aegis_cmd_queue) {
                const result = await this.route(item.cmd, item.model);
                if (item.resolve) item.resolve(result);
            }
            delete window._aegis_cmd_queue;
        }

        this.context.log("Core Bridge Ready.");
    },

    route: async function (command, model = 'gemini') {
        const trimmedCmd = command.trim();
        const parts = trimmedCmd.split(' ');
        const firstWord = parts[0].toLowerCase();

        if (firstWord === '/help' || firstWord === 'help') return this.showHelp(trimmedCmd);

        let handler = this.registry.get(firstWord);

        // Alias check
        if (!handler) {
            const potentialAlias = (firstWord.startsWith('/') ? firstWord.substring(1) : firstWord);
            const targetPluginId = this.aliases[potentialAlias];
            if (targetPluginId) {
                const canonicalPrefix = `/${targetPluginId}`;
                handler = this.registry.get(canonicalPrefix) || this.registry.get(targetPluginId);
            }
        }

        if (handler) return await handler(trimmedCmd, model);

        return await this.processAIQuery(trimmedCmd, model);
    },

    processAIQuery: async function (command, model = 'gemini') {
        if (window.appendLog) window.appendLog('AI', `Querying ${model.toUpperCase()}...`, true);

        try {
            const muteRegex = /(?:\s|^)--(m|mute)(?:\s|$)/i;
            const isMuted = muteRegex.test(command);
            const cleanCommand = command.replace(muteRegex, ' ').trim();

            const res = await fetch('/api/system/ai/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cleanCommand, model: model })
            });

            const data = await res.json();
            const display = data.display || data.response || data.text || "No response";
            const briefing = data.briefing || display;
            const visualType = data.visual_type || 'system';

            if (window.appendLog) window.appendLog('AI', display);

            if (window.speakTTS && !isMuted) {
                window.speakTTS(display, data.audio_url || null, visualType, briefing);
            }

            if (window.reactionEngine && data.sentiment) {
                window.reactionEngine.checkAndTrigger('ai_response', data, 0);
            }

            return data;
        } catch (e) {
            if (window.appendLog) window.appendLog('SYSTEM', `AI Error: ${e.message}`);
            return { status: 'error', message: e.message };
        }
    },

    showHelp: async function (command = "") {
        const muteRegex = /(?:\s|^)--(m|mute)(?:\s|$)/i;
        const isMuted = muteRegex.test(command);
        let helpMsg = "";

        try {
            const res = await fetch('/api/system/ai/help');
            const data = res.ok ? await res.json() : { help_text: "Help data error." };
            helpMsg = data.help_text + "\n\n";
        } catch (e) {
            helpMsg = "Help integration failed.\n\n";
        }

        const commands = Array.from(this.registry.keys()).sort();
        if (commands.length > 0) {
            helpMsg += "**[Front-end Commands]**\n" + commands.map(c => `- \`${c}\``).join('\n') + "\n\n";
        }

        if (window.appendLog) window.appendLog('SYSTEM', helpMsg);
        if (window.speakTTS && !isMuted) window.speakTTS("Help displayed.", null, 'system');

        return { status: 'success' };
    }
};
