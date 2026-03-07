/**
 * AEGIS Plugin-X Notion Widget (v1.0)
 */
export default {
    updateTimer: null,
    currentWorkspace: null,
    pendingMatches: [],
    config: { widget_display_limit: 10, polling_interval_ms: 300000 },

    init: async function (shadowRoot, context) {
        this.context = context;
        context.log("Notion Widget Initializing...");

        // 1. 설정 로드
        try {
            const configRes = await fetch('/api/plugins/notion/config');
            const configData = await configRes.json();
            if (configData.success) {
                Object.assign(this.config, configData.config);
            }
        } catch (e) { }

        const listContainer = shadowRoot.getElementById('notion-list');
        const refreshBtn = shadowRoot.getElementById('notion-refresh-btn');
        const briefBtn = shadowRoot.getElementById('notion-brief-btn');

        const refreshNotion = async () => {
            try {
                const limit = this.config.widget_display_limit || 10;
                const response = await fetch(`/api/plugins/notion/recent?limit=${limit}`);
                const data = await response.json();

                if (data.success && data.items && data.items.length > 0) {
                    listContainer.innerHTML = data.items.map(item => {
                        const date = new Date(item.created_time);
                        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                        return `
                            <div class="notion-item" data-id="${item.id}">
                                <span class="notion-item-title">${item.title}</span>
                                <span class="notion-item-time">${dateStr}</span>
                            </div>
                        `;
                    }).join('');

                    // 클릭 이벤트 바인딩 (innerHTML 주입 후)
                    shadowRoot.querySelectorAll('.notion-item').forEach(el => {
                        el.onclick = () => {
                            const id = el.getAttribute('data-id').replace(/-/g, '');
                            window.open(`https://www.notion.so/${id}`, '_blank');
                        };
                    });
                } else if (data.success && data.items && data.items.length === 0) {
                    listContainer.innerHTML = '<div class="loading-text" style="opacity: 0.5;">Empty (No recent items found)</div>';
                } else {
                    listContainer.innerHTML = '<div class="loading-text">데이터를 불러오지 못했습니다.</div>';
                }
            } catch (error) {
                listContainer.innerHTML = '<div class="loading-text">서버 연결 오류</div>';
            }
        };

        const triggerBriefing = async () => {
            const selectedModel = window.AEGIS_AI_MODEL || 'gemini';
            context.log(`Triggering briefing with ${selectedModel}...`);

            try {
                // AI Gateway 프록시 사용 (필요 시 /api/plugins/notion/brief 직접 호출 가능)
                const response = await fetch(`/api/plugins/notion/brief?model=${selectedModel}`);
                const data = await response.json();

                if (data.success) {
                    context.appendLog(`NOTION (${selectedModel.toUpperCase()})`, data.display);
                    if (data.voice) context.speak(data.voice, null, `NOTION_${selectedModel.toUpperCase()}`);
                    context.triggerReaction('briefing', { sentiment: data.sentiment }, 0);
                } else {
                    context.log("Briefing failed: " + (data.message || "Unknown error"));
                    context.appendLog('ERROR', "브리핑 생성 실패: " + (data.message || "Unknown error"));
                }
            } catch (e) {
                context.log("Briefing failed: " + e.message);
                context.appendLog('ERROR', "브리핑 요청 중 서버 오류가 발생했습니다.");
            }
        };

        if (refreshBtn) refreshBtn.onclick = () => refreshNotion();
        if (briefBtn) briefBtn.onclick = () => triggerBriefing();

        // 1. 서비스 등록 (TTS Icon 등)
        context.registerTtsIcon('notion', '📓');

        // 2. 명령어 등록 (Plugin-X Architecture)
        context.registerCommand('/@', (cmd) => this.handleAdd(cmd.replace('/', '/n ')));
        // [v2.7.0] @는 멀티 AI 멘션(Context Injection)을 위해 글로벌로 예약되므로 해제함 (UX 모호성 해결)
        context.registerCommand('/n', (cmd) => this.handleAdd(cmd));
        context.registerCommand('/ns', (cmd) => this.handleSearch(cmd));
        context.registerCommand('/s', (cmd) => this.handleSearch(cmd));
        context.registerCommand('/search', (cmd) => this.handleSearch(cmd));
        context.registerCommand('/switch', (cmd) => this.handleSearch(cmd.replace('/switch ', '/ns switch ')));
        context.registerCommand('/notion', () => refreshNotion());

        // 3. 초기 로드 및 자동 갱신
        refreshNotion();
        window.refreshNotionWidget = refreshNotion; // [Plugin-X] 터미널 연동용 글로벌 노출
        this.updateTimer = setInterval(refreshNotion, this.config.polling_interval_ms);

        // 4. 독립 검색창(Search Window) 컴포넌트 마운트
        this.setupSearchWindow(shadowRoot, context);
    },

    /**
     * Notion 통합 명령어 처리 (/n 또는 /todo)
     */
    async handleAdd(command) {
        const context = this.context;
        let notionText = command.substring(command.indexOf(' ') + 1).trim();
        let targetWorkspace = this.currentWorkspace;

        // [PREFIX] @로 시작하는 별칭 감지 (예: /memo @개인 장보기)
        if (notionText.startsWith('@')) {
            const parts = notionText.split(' ');
            targetWorkspace = parts[0]; // @별칭 추출
            notionText = parts.slice(1).join(' ').trim();
        }

        window.AEGIS_AI_MODEL = window.AEGIS_AI_MODEL || 'gemini';
        context.appendLog('SYSTEM', `${targetWorkspace ? targetWorkspace + ' 워크스페이스에 ' : ''}항목을 기록 중입니다...`);

        try {
            const res = await fetch('/api/plugins/notion/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: notionText,
                    workspace: targetWorkspace
                })
            });
            const result = await res.json();

            if (result.success) {
                context.appendLog('NOTION', `✅ 성공적으로 기록되었습니다: "${notionText}"`);

                if (typeof window.refreshNotionWidget === 'function') {
                    window.refreshNotionWidget();
                }

                if (typeof window.dispatchAvatarEvent === 'function') {
                    window.dispatchAvatarEvent('MOTION', { alias: 'joy' });
                }
            } else {
                context.appendLog('ERROR', `❌ 노션 기록 실패: ${result.message}`);
            }
        } catch (err) {
            context.appendLog('ERROR', `❌ 서버 통신 오류: ${err.message}`);
        }
    },

    /**
     * Notion 검색 (/ns) 명령어 처리
     */
    async handleSearch(command) {
        const context = this.context;
        const query = command.substring(command.indexOf(' ') + 1).trim();

        const cleanQuery = query.toLowerCase();
        if (cleanQuery === 'clean' || cleanQuery === '정리') {
            return this.handleCleanup(context);
        }
        if (cleanQuery === 'cleanup' || cleanQuery === '정리실행') {
            return this.handleApplyCleanup(context);
        }

        if (cleanQuery.startsWith('switch ') || cleanQuery.startsWith('전환 ')) {
            const ws = query.split(' ')[1];
            return this.setWorkspace(ws, context);
        }

        context.appendLog('SYSTEM', `워크스페이스 전체에서 "${query}" 검색 중...`);

        if (window.NotionSearchWindow) {
            window.NotionSearchWindow.open(query);
            context.speak(`워크스페이스 전체에서 "${query}" 검색 결과를 확인해 주세요.`, null, 'notion');
            if (typeof window.dispatchAvatarEvent === 'function') {
                window.dispatchAvatarEvent('MOTION', { alias: 'joy' });
            }
        } else {
            context.appendLog('ERROR', '❌ 검색창 모듈이 로드되지 않았습니다.');
        }
    },

    /**
     * Notion 규칙 기반 자동 정리 (/ns clean)
     */
    async handleCleanup() {
        const context = this.context;
        context.appendLog('SYSTEM', '노션 지식 베이스 정리 규칙을 검토 중입니다...');

        try {
            const res = await fetch('/api/plugins/notion/rules/evaluate');
            const result = await res.json();

            if (result.success && result.matches.length > 0) {
                this.pendingMatches = result.matches;
                context.appendLog('NOTION', `📋 **정리 대상 ${result.matches.length}건을 발견했습니다!**`);

                context.speak(`워크스페이스 정리가 필요한 항목 ${result.matches.length}건을 발견했습니다. 제안된 대로 분류를 진행할까요?`, null, 'notion');

                let output = "";
                result.matches.slice(0, 5).forEach((m, idx) => {
                    const actionInfo = m.action?.target_value || m.actions?.[0]?.value || '(action)';
                    output += `${idx + 1}. [${m.rule_name}] "${m.title}" → ${actionInfo}\n`;
                });
                if (result.matches.length > 5) output += `...외 ${result.matches.length - 5}건 더 발견됨.\n`;

                context.appendLog('SYSTEM', output);
                context.appendLog('HELP', '실행하시려면 터미널에 **"/ns cleanup"** 또는 **"/ns 정리실행"**을 입력해 주세요.');
            } else {
                this.pendingMatches = [];
                context.appendLog('NOTION', '✨ 현재 규칙에 따라 정리할 항목이 없이 깔끔한 상태입니다.');
                context.speak("검토 결과, 모든 항목이 이미 잘 분류되어 있습니다.", null, 'notion');
            }
        } catch (err) {
            context.appendLog('ERROR', `정리 검토 중 오류 발생: ${err.message}`);
        }
    },

    /**
     * 노션 정리 실제 적용 실행
     */
    async handleApplyCleanup() {
        const context = this.context;
        if (!this.pendingMatches || this.pendingMatches.length === 0) {
            context.appendLog('ERROR', '❌ 실행할 정리 항목이 없습니다. 먼저 "/ns clean"으로 검토해 주세요.');
            return;
        }

        const count = this.pendingMatches.length;
        context.appendLog('SYSTEM', `${count}건의 항목에 대해 규칙 적용을 시작합니다...`);

        let successCount = 0;
        try {
            for (const match of this.pendingMatches) {
                const res = await fetch('/api/plugins/notion/rules/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        page_id: match.page_id,
                        action: match.action
                    })
                });
                const data = await res.json();
                if (data.success) successCount++;
            }

            context.appendLog('NOTION', `✅ 정리가 완료되었습니다! (총 ${count}건 중 ${successCount}건 성공)`);
            context.speak(`워크스페이스 정리를 마쳤습니다. 총 ${successCount}개의 항목이 성공적으로 분류되었습니다.`, null, 'notion');

            if (typeof window.refreshNotionWidget === 'function') window.refreshNotionWidget();
            if (typeof window.dispatchAvatarEvent === 'function') {
                window.dispatchAvatarEvent('MOTION', { alias: 'joy' });
            }

            this.pendingMatches = [];
        } catch (err) {
            context.appendLog('ERROR', `작업 수행 중 오류 발생: ${err.message}`);
        }
    },

    /**
     * 기본 워크스페이스 컨텍스트 설정
     */
    setWorkspace(alias) {
        const context = this.context;
        if (!alias) {
            this.currentWorkspace = null;
            context.appendLog('SYSTEM', '기본 워크스페이스로 복귀했습니다.');
            return;
        }

        this.currentWorkspace = alias.startsWith('@') ? alias : '@' + alias;
        context.appendLog('NOTION', `📍 컨텍스트가 **${this.currentWorkspace}** (으)로 전환되었습니다.`);
        context.appendLog('HELP', `이제 모든 /memo 명령은 기본적으로 ${this.currentWorkspace}에 저장됩니다.`);
        context.speak(`${this.currentWorkspace} 워크스페이스로 전환되었습니다.`, null, 'notion');
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        window.NotionSearchWindow = null;
        console.log("[Plugin-X] Notion Widget Destroyed.");
    },

    setupSearchWindow: function (shadowRoot, context) {
        const win = shadowRoot.getElementById('notion-search-window');
        const header = shadowRoot.getElementById('search-window-header');
        const resizeHandle = shadowRoot.getElementById('search-window-resize');
        const closeBtn = shadowRoot.getElementById('search-close-btn');
        const statusEl = shadowRoot.getElementById('search-status');
        const listEl = shadowRoot.getElementById('search-results-list');

        if (!win) return; // UI 요소가 없으면 검색창 초기화 중단

        // --- Window Management Internal Helpers ---
        const setupDraggable = (winEl, headEl) => {
            let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
            headEl.onmousedown = (e) => {
                e = e || window.event;
                e.preventDefault();
                p3 = e.clientX; p4 = e.clientY;
                document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
                document.onmousemove = (e) => {
                    e = e || window.event; e.preventDefault();
                    p1 = p3 - e.clientX; p2 = p4 - e.clientY;
                    p3 = e.clientX; p4 = e.clientY;
                    winEl.style.top = (winEl.offsetTop - p2) + "px";
                    winEl.style.left = (winEl.offsetLeft - p1) + "px";
                    winEl.style.transform = 'none';
                };
            };
        };

        const setupResizable = (winEl, handleEl) => {
            let ow = 0, oh = 0, omx = 0, omy = 0;
            handleEl.onmousedown = (e) => {
                e.preventDefault();
                ow = winEl.offsetWidth; oh = winEl.offsetHeight;
                omx = e.pageX; omy = e.pageY;
                const resize = (e) => {
                    const w = ow + (e.pageX - omx);
                    const h = oh + (e.pageY - omy);
                    if (w > 350) winEl.style.width = w + 'px';
                    if (h > 300) winEl.style.height = h + 'px';
                };
                const stop = () => { window.removeEventListener('mousemove', resize); window.removeEventListener('mouseup', stop); };
                window.addEventListener('mousemove', resize);
                window.addEventListener('mouseup', stop);
            };
        };

        const searchCtx = {
            open: (query = '') => {
                win.classList.add('active');
                if (query) searchCtx.search(query);
            },
            close: () => {
                win.classList.remove('active');
            },
            search: async (query) => {
                statusEl.textContent = `"${query}" 검색 중...`;
                listEl.innerHTML = '';
                try {
                    const res = await fetch(`/api/plugins/notion/search?query=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    if (data.success && data.items.length > 0) {
                        statusEl.textContent = `${data.items.length}개의 항목을 찾았습니다.`;
                        searchCtx.renderResults(data.items);
                    } else {
                        statusEl.textContent = "검색 결과가 없습니다.";
                    }
                } catch (e) {
                    statusEl.textContent = "검색 중 오류 발생.";
                }
            },
            renderResults: (items) => {
                listEl.innerHTML = '';
                const iconMap = { 'database': '📂', 'page': '📄' };
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'search-item';
                    const timeStr = new Date(item.updated_time).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    li.innerHTML = `
                        <div class="item-icon" style="font-size: 20px;">${iconMap[item.type] || '📝'}</div>
                        <div class="item-info" style="flex:1;">
                            <div class="item-title" style="color:#fff; font-weight:500;">${item.title}</div>
                            <div class="item-meta" style="font-size:11px; color:#888;">
                                <span class="item-type" style="color:#00d2ff; font-weight:bold;">${item.type}</span> | 최근 수정: ${timeStr}
                            </div>
                        </div>
                    `;
                    li.onclick = () => window.open(item.url, '_blank');
                    listEl.appendChild(li);
                });
            }
        };

        window.NotionSearchWindow = searchCtx;
        setupDraggable(win, header);
        setupResizable(win, resizeHandle);
        closeBtn.addEventListener('click', () => searchCtx.close());
    }
};
