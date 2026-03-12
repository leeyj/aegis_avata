/**
 * AEGIS MessageHandlers - AI & Network Domain (v4.2)
 * Handles AI queries, command routing, and proxied network requests.
 */
export const AiHandlers = {
    'FETCH': async (data, source) => {
        try {
            const { url, options, proxy_token } = data;
            if (proxy_token) {
                const proxyRes = await window.fetch('/api/plugins/proxy/data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        plugin_id: source,
                        proxy_token,
                        url,
                        method: options.method || 'GET',
                        data: options.body ? JSON.parse(options.body) : {}
                    })
                });
                return await proxyRes.json();
            } else {
                const res = await window.fetch(url, options);
                return await res.json();
            }
        } catch (e) {
            return { status: 'error', message: e.message };
        }
    },

    'REQ_AI': async (data, source) => {
        try {
            const { task, data: payload, proxy_token } = data;
            const res = await window.fetch('/api/plugins/proxy/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plugin_id: source,
                    proxy_token,
                    task,
                    data: payload
                })
            });
            return await res.json();
        } catch (e) {
            return { status: 'error', message: e.message };
        }
    },

    'ROUTE_CMD': async (data) => {
        try {
            const { cmd, model } = data;
            const trimmedCmd = cmd.trim();
            const firstWord = trimmedCmd.split(' ')[0].toLowerCase();
            
            // [v4.2.7] Systematic Command Interception
            // Check if there's a registered frontend handler for this prefix
            if (window._aegis_cmd_registry && window._aegis_cmd_registry.has(firstWord)) {
                console.log(`[AiHandlers] Intercepting systematic command: ${firstWord}`);
                const handler = window._aegis_cmd_registry.get(firstWord);
                if (typeof handler === 'function') {
                    const result = await handler(trimmedCmd, model);
                    return result || { status: 'success', message: 'Command executed locally' };
                }
            }

            // 2. AI 질의 수행 (Systematic 명령어가 아닐 경우)
            const sid = (window.socketSync && window.socketSync.socket) ? window.socketSync.socket.id : null;
            
            const res = await window.fetch('/api/system/ai/query', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Session-ID': sid // [v4.2.9] 세션 격리를 위한 Socket ID 전달
                },
                body: JSON.stringify({
                    command: trimmedCmd,
                    model: model || window.activeAiEngine || 'gemini'
                })
            });
            return await res.json();
        } catch (e) {
            return { status: 'error', message: e.message };
        }
    },

    'GET_AI_ENGINE': async () => {
        return { engineId: window.activeAiEngine || 'gemini' };
    },

    'CHANGE_AI_ENGINE': async (data) => {
        window.activeAiEngine = data.engineId;
        if (window.saveSettings) window.saveSettings();
        return { success: true };
    }
};
