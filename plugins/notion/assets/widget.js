export default {
    updateTimer: null,
    currentWorkspace: null,
    pendingMatches: [],
    config: { widget_display_limit: 10, polling_interval_ms: 300000 },
    api: null,
    searchWindow: null,
    renderer: null,

    init: async function (root, context) {
        this.context = context;
        this.root = root;
        context.log("Notion Widget Initializing...");

        // Load modules dynamically using context.resolve
        const APIModule = await import(context.resolve('assets/api.js'));
        const SearchModule = await import(context.resolve('assets/search.js'));
        const RendererModule = await import(context.resolve('assets/renderer.js'));

        this.api = new APIModule.default(context);
        this.searchWindow = new SearchModule.default(root, this.api, context);
        this.renderer = new RendererModule.default(root, this.api, context);

        const loadedConfig = await this.api.getConfig();
        if (loadedConfig) {
            Object.assign(this.config, loadedConfig);
        }

        const refreshBtn = root.getElementById('notion-refresh-btn');
        const briefBtn = root.getElementById('notion-brief-btn');

        if (refreshBtn) refreshBtn.onclick = () => this.refreshNotionWidget();
        if (briefBtn) briefBtn.onclick = () => this.triggerBriefing();

        context.registerTtsIcon('notion', '📓');

        context.registerCommand('/@', (cmd) => this.handleAdd(cmd.replace('/', '/n ')));
        context.registerCommand('/n', (cmd) => this.handleAdd(cmd));
        context.registerCommand('/ns', (cmd) => this.handleSearch(cmd));
        context.registerCommand('/s', (cmd) => this.handleSearch(cmd));
        context.registerCommand('/search', (cmd) => this.handleSearch(cmd));
        context.registerCommand('/memo', (cmd) => this.handleAdd(cmd));
        context.registerCommand('/switch', (cmd) => this.handleSearch(cmd.replace('/switch ', '/ns switch ')));
        context.registerCommand('/notion', () => this.refreshNotionWidget());

        this.refreshNotionWidget();
        this.updateTimer = setInterval(() => this.refreshNotionWidget(), this.config.polling_interval_ms);
    },

    refreshNotionWidget: async function() {
        if (this.renderer) {
            await this.renderer.refreshNotion(this.config.widget_display_limit);
        }
    },

    triggerBriefing: async function() {
        const state = await this.context.getSystemState();
        const selectedModel = state.activeModel || 'gemini';
        this.context.log(`Triggering briefing with ${selectedModel}...`);

        try {
            const data = await this.api.triggerBriefing(selectedModel);
            if (data && data.success) {
                this.context.appendLog(`NOTION (${selectedModel.toUpperCase()})`, data.display);
                if (data.voice) this.context.speak(data.voice, null, `NOTION_${selectedModel.toUpperCase()}`);
                this.context.triggerReaction('briefing', { sentiment: data.sentiment }, 0);
            } else {
                this.context.appendLog('ERROR', "브리핑 생성 실패: " + (data?.message || "Unknown error"));
            }
        } catch (e) {
            this.context.appendLog('ERROR', "브리핑 요청 중 서버 오류가 발생했습니다.");
        }
    },

    async handleAdd(command) {
        const spaceIdx = command.indexOf(' ');
        if (spaceIdx === -1) {
            this.context.appendLog('HELP', '사용법: /memo [기록할 내용] 또는 /n [내용]');
            return;
        }

        let notionText = command.substring(spaceIdx + 1).trim();
        if (!notionText) {
            this.context.appendLog('HELP', '기록할 내용을 입력해 주세요.');
            return;
        }
        let targetWorkspace = this.currentWorkspace;

        if (notionText.startsWith('@')) {
            const parts = notionText.split(' ');
            targetWorkspace = parts[0]; 
            notionText = parts.slice(1).join(' ').trim();
        }

        this.context.appendLog('SYSTEM', `${targetWorkspace ? targetWorkspace + ' 워크스페이스에 ' : ''}항목을 기록 중입니다...`);

        try {
            const result = await this.api.addItem(notionText, targetWorkspace);
            if (result && result.success) {
                this.context.appendLog('NOTION', `✅ 성공적으로 기록되었습니다: "${notionText}"`);
                this.refreshNotionWidget();
                
                this.context.triggerReaction('joy', {}, 0); 
            } else {
                this.context.appendLog('ERROR', `❌ 노션 기록 실패: ${result?.message}`);
            }
        } catch (err) {
            this.context.appendLog('ERROR', `❌ 서버 통신 오류: ${err.message}`);
        }
    },

    async handleSearch(command) {
        const spaceIdx = command.indexOf(' ');
        const query = spaceIdx === -1 ? '' : command.substring(spaceIdx + 1).trim();
        const cleanQuery = query.toLowerCase();

        if (!query) {
            this.context.appendLog('HELP', '사용법: /ns clean (정리) 또는 /ns [검색어]');
            return;
        }

        if (cleanQuery === 'clean' || cleanQuery === '정리') return this.handleCleanup();
        if (cleanQuery === 'cleanup' || cleanQuery === '정리실행') return this.handleApplyCleanup();

        if (cleanQuery.startsWith('switch ') || cleanQuery.startsWith('전환 ')) {
            const ws = query.split(' ')[1];
            return this.setWorkspace(ws);
        }

        this.context.appendLog('SYSTEM', `워크스페이스 전체에서 "${query}" 검색 중...`);

        if (this.searchWindow) {
            this.searchWindow.open(query);
            this.context.speak(`워크스페이스 전체에서 "${query}" 검색 결과를 확인해 주세요.`, null, 'notion');
            this.context.triggerReaction('joy', {}, 0);
        } else {
            this.context.appendLog('ERROR', '❌ 검색창 모듈이 로드되지 않았습니다.');
        }
    },

    async handleCleanup() {
        this.context.appendLog('SYSTEM', '노션 지식 베이스 정리 규칙을 검토 중입니다...');

        try {
            const result = await this.api.evaluateRules();
            if (result && result.success && result.matches.length > 0) {
                this.pendingMatches = result.matches;
                this.context.appendLog('NOTION', `📋 **정리 대상 ${result.matches.length}건을 발견했습니다!**`);
                this.context.speak(`워크스페이스 정리가 필요한 항목 ${result.matches.length}건을 발견했습니다. 제안된 대로 분류를 진행할까요?`, null, 'notion');

                let output = "";
                result.matches.slice(0, 5).forEach((m, idx) => {
                    const actionInfo = m.action?.target_value || m.actions?.[0]?.value || '(action)';
                    output += `${idx + 1}. [${m.rule_name}] "${m.title}" → ${actionInfo}\n`;
                });
                if (result.matches.length > 5) output += `...외 ${result.matches.length - 5}건 더 발견됨.\n`;

                this.context.appendLog('SYSTEM', output);
                this.context.appendLog('HELP', '실행하시려면 터미널에 **"/ns cleanup"** 또는 **"/ns 정리실행"**을 입력해 주세요.');
            } else {
                this.pendingMatches = [];
                this.context.appendLog('NOTION', '✨ 현재 규칙에 따라 정리할 항목이 없이 깔끔한 상태입니다.');
                this.context.speak("검토 결과, 모든 항목이 이미 잘 분류되어 있습니다.", null, 'notion');
            }
        } catch (err) {
            this.context.appendLog('ERROR', `정리 검토 중 오류 발생: ${err.message}`);
        }
    },

    async handleApplyCleanup() {
        if (!this.pendingMatches || this.pendingMatches.length === 0) {
            this.context.appendLog('ERROR', '❌ 실행할 정리 항목이 없습니다. 먼저 "/ns clean"으로 검토해 주세요.');
            return;
        }

        const count = this.pendingMatches.length;
        this.context.appendLog('SYSTEM', `${count}건의 항목에 대해 규칙 적용을 시작합니다...`);

        let successCount = 0;
        try {
            for (const match of this.pendingMatches) {
                const data = await this.api.applyRule(match.page_id, match.action);
                if (data && data.success) successCount++;
            }

            this.context.appendLog('NOTION', `✅ 정리가 완료되었습니다! (총 ${count}건 중 ${successCount}건 성공)`);
            this.context.speak(`워크스페이스 정리를 마쳤습니다. 총 ${successCount}개의 항목이 성공적으로 분류되었습니다.`, null, 'notion');

            this.refreshNotionWidget();
            this.context.triggerReaction('joy', {}, 0);
            this.pendingMatches = [];
        } catch (err) {
            this.context.appendLog('ERROR', `작업 수행 중 오류 발생: ${err.message}`);
        }
    },

    setWorkspace(alias) {
        if (!alias) {
            this.currentWorkspace = null;
            this.context.appendLog('SYSTEM', '기본 워크스페이스로 복귀했습니다.');
            return;
        }

        this.currentWorkspace = alias.startsWith('@') ? alias : '@' + alias;
        this.context.appendLog('NOTION', `📍 컨텍스트가 **${this.currentWorkspace}** (으)로 전환되었습니다.`);
        this.context.appendLog('HELP', `이제 모든 /memo 명령은 기본적으로 ${this.currentWorkspace}에 저장됩니다.`);
        this.context.speak(`${this.currentWorkspace} 워크스페이스로 전환되었습니다.`, null, 'notion');
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        console.log("[Plugin-X] Notion Widget Destroyed.");
    }
};
