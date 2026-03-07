/**
 * AEGIS Unified AI Gateway & Command Router
 * Standardizes AI query dispatch and response handling.
 * [v2.0] Integrated with Gemini Unified AI Hub.
 */

window.CommandRouter = {
    aliases: {}, // Synchronized dynamically from backend (PluginRegistry)
    registry: new Map(),
    _initialized: null,

    /**
     * 알리아스 매핑 정보를 서버에서 가져와 동기화합니다. (Hardcoding 배제)
     */
    init: function () {
        if (this._initialized) return this._initialized;

        this._initialized = (async () => {
            try {
                const res = await fetch(`/api/plugins/aliases?t=${Date.now()}`);
                if (res.ok) {
                    this.aliases = await res.json();
                    console.log("[CommandRouter] Aliases synchronized from backend:", Object.keys(this.aliases).length);
                }
            } catch (e) {
                console.error("[CommandRouter] Alias synchronization failed.");
            }
        })();

        return this._initialized;
    },

    /**
     * 플러그인 전용 명령어 등록
     * @param {string} prefix 명령어 접두사 (예: '/todo', '/weather')
     * @param {function} callback 실행할 로직 (payload, model)
     */
    register: function (prefix, callback) {
        this.registry.set(prefix.toLowerCase(), callback);
        console.log(`[CommandRouter] Registered prefix: ${prefix}`);
    },

    /**
     * 입력을 분석하여 명령을 라우팅하거나 AI 에디터에 질의를 보냅니다.
     * @param {string} command 유저 입력 명령어
     * @param {string} model 사용할 AI 모델 (gemini, ollama 등)
     */
    route: async function (command, model = 'gemini') {
        const trimmedCmd = command.trim();
        const parts = trimmedCmd.split(' ');
        const rawFirstWord = parts[0];
        const firstWord = rawFirstWord.toLowerCase();

        // 0. 시스템 내장 명령어 처리
        if (firstWord === '/help' || firstWord === 'help') {
            return this.showHelp(trimmedCmd);
        }

        // 1. 직접 등록된 플러그인 명령 확인 (Full match)
        let handler = this.registry.get(firstWord);
        let prefix = handler ? firstWord : "";

        // [v3.1 Fundamental Fix] 알리아스 역추적 (Slash 있든 없든 처리)
        if (!handler) {
            const potentialAlias = (firstWord.startsWith('/') ? firstWord.substring(1) : firstWord);
            const targetPluginId = this.aliases[potentialAlias];

            if (targetPluginId) {
                // targetPluginId가 'gmail'이면 '/gmail'을 찾아봄
                const canonicalPrefix = `/${targetPluginId}`;
                handler = this.registry.get(canonicalPrefix) || this.registry.get(targetPluginId);

                if (handler) {
                    console.log(`[CommandRouter] Alias success: ${rawFirstWord} -> ${targetPluginId}`);
                    prefix = rawFirstWord;
                }
            }
        }

        // 2. 기호 기반 접두사 매칭 (@멘션 등)
        if (!handler) {
            for (const [regPrefix, regHandler] of this.registry.entries()) {
                if (regPrefix.length === 1 && trimmedCmd.startsWith(regPrefix)) {
                    prefix = regPrefix;
                    handler = regHandler;
                    break;
                }
            }
        }

        if (handler) {
            try {
                return await handler(trimmedCmd, model);
            } catch (e) {
                console.error(`[CommandRouter] Error in handler for '${prefix}':`, e);
            }
        }

        // 3. 명령어 접두사가 없거나 매칭되지 않으면 AI 엔진에 질의 (General Query)
        return await this.processAIQuery(trimmedCmd, model);
    },

    /**
     * AI 엔진에 질의를 보내고 결과를 표준 형식으로 처리하여 터미널 및 음성으로 출력합니다.
     */
    processAIQuery: async function (command, model = 'gemini') {
        const logMsg = `Processing query with ${model.toUpperCase()}...`;
        if (typeof window.appendLog === 'function') window.appendLog('AI', logMsg, true);
        else console.log(`[AI] ${logMsg}`);

        try {
            // [v2.8.0] 음소거 플래그 파싱
            const muteRegex = /(?:\s|^)--(m|mute)(?:\s|$)/i;
            const isMuted = muteRegex.test(command);
            const cleanCommand = command.replace(muteRegex, ' ').trim();

            const res = await fetch('/api/system/ai/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: cleanCommand,
                    model: model
                })
            });

            const data = await res.json();

            // 1. 응답 표준화 (v3.0): display-briefing 필드 사용
            const display = data.display || data.response || data.text || "No displayable response.";
            const briefing = data.briefing || data.voice || display; // 음성용 필드 fallback
            const visualType = data.visual_type || 'system';

            // 2. 터미널 출력 (디커플링 적용)
            if (typeof window.appendLog === 'function') {
                window.appendLog('AI', display);
            } else {
                console.log(`[AI Response] ${display}`);
            }

            // 3. 음성 및 말풍선 출력 (전역 TTS 서비스 활용, 단 음소거 플래그가 없을 때만)
            if (window.speakTTS && !isMuted) {
                window.speakTTS(display, data.audio_url || null, visualType, briefing);
            }

            // 4. 수치 기반 리액션 엔진 트리거 (기존 기능 유지)
            if (window.reactionEngine && data.sentiment) {
                window.reactionEngine.checkAndTrigger('ai_response', data, 0);
            }

            return data;

        } catch (e) {
            const errorMsg = `AI Gateway Error: ${e.message}`;
            console.error(errorMsg);
            if (typeof window.appendLog === 'function') window.appendLog('SYSTEM', errorMsg);
            return { status: 'error', message: e.message };
        }
    },

    /**
     * 사용 가능한 명령어 목록을 터미널에 출력합니다.
     */
    showHelp: async function (command = "") {
        // [v2.8.0] 음소거 플래그 파싱
        const muteRegex = /(?:\s|^)--(m|mute)(?:\s|$)/i;
        const isMuted = muteRegex.test(command);

        let helpMsg = "";

        try {
            const res = await fetch('/api/system/ai/help');
            if (res.ok) {
                const data = await res.json();
                helpMsg = data.help_text + "\n\n";
            } else {
                helpMsg = "### 🖥️ AEGIS 시스템 명령어 가이드\n\n_도움말 데이터를 불러오는데 실패했습니다._\n\n";
            }
        } catch (e) {
            helpMsg = "### 🖥️ AEGIS 시스템 명령어 가이드\n\n_도움말 통합에 실패했습니다._\n\n";
        }

        const commands = Array.from(this.registry.keys()).sort();
        if (commands.length > 0) {
            helpMsg += "**[프론트엔드 시스템 명령어]**\n";
            commands.forEach(cmd => {
                helpMsg += `- \`${cmd}\`\n`;
            });
            helpMsg += "\n";
        }

        helpMsg += "**[기타 단축키]**\n";
        helpMsg += "- `Shift + ~`: 터미널 창을 토글합니다 (퀘이크 스타일 HUD).\n";

        if (typeof window.appendLog === 'function') {
            window.appendLog('SYSTEM', helpMsg);
        } else {
            console.log(`[SYSTEM Help]\n${helpMsg}`);
        }

        if (window.speakTTS && !isMuted) {
            window.speakTTS("강화된 도움말을 출력했습니다. 새롭게 추가된 명령어와 인지 가능한 알리아스 목록을 확인해주세요.", null, 'system');
        }

        return { status: 'success', message: 'Help displayed' };
    }
};

// [v2.0] Legacy Compatibility Bridge
window.initExternalAPI = () => {
    console.log("[CommandRouter] Legacy initExternalAPI called.");
};
