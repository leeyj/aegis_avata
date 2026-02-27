/**
 * AEGIS Terminal - Notion Command Handler
 * Handles /n, /todo, and /ns commands.
 */
window.NotionHandler = {
    currentWorkspace: null, // 현재 선택된 워크스페이스 (별칭)

    /**
     * Notion 통합 명령어 처리 (/n 또는 /todo)
     */
    async handleAdd(command) {
        let notionText = command.substring(command.indexOf(' ') + 1).trim();
        let targetWorkspace = this.currentWorkspace;

        // [PREFIX] @로 시작하는 별칭 감지 (예: /memo @개인 장보기)
        if (notionText.startsWith('@')) {
            const parts = notionText.split(' ');
            targetWorkspace = parts[0]; // @별칭 추출
            notionText = parts.slice(1).join(' ').trim();
        }

        window.TerminalUI.appendLog('SYSTEM', `${targetWorkspace ? targetWorkspace + ' 워크스페이스에 ' : ''}항목을 기록 중입니다...`, true);

        try {
            const res = await fetch('/api/notion/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: notionText,
                    workspace: targetWorkspace
                })
            });
            const result = await res.json();

            if (result.success) {
                window.TerminalUI.appendLog('NOTION', `✅ 성공적으로 기록되었습니다: "${notionText}"`);

                // [MOD] 위젯 리스트 즉시 갱신 (모듈 간 연동)
                if (typeof window.refreshNotionWidget === 'function') {
                    window.refreshNotionWidget();
                }

                if (typeof window.dispatchAvatarEvent === 'function') {
                    window.dispatchAvatarEvent('MOTION', { alias: 'joy' }); // 성공 리액션
                }
            } else {
                window.TerminalUI.appendLog('ERROR', `❌ 노션 기록 실패: ${result.message}`);
            }
        } catch (err) {
            window.TerminalUI.appendLog('ERROR', `❌ 서버 통신 오류: ${err.message}`);
        }
    },

    /**
     * Notion 검색 (/ns) 명령어 처리 - 토큰 절약용 Native Search
     */
    async handleSearch(command) {
        const query = command.substring(command.indexOf(' ') + 1).trim();

        // [MOD] 정리(Cleanup) 및 워크스페이스 전환 감지
        const cleanQuery = query.toLowerCase();
        if (cleanQuery === 'clean' || cleanQuery === '정리') {
            return this.handleCleanup();
        }
        if (cleanQuery === 'cleanup' || cleanQuery === '정리실행') {
            return this.handleApplyCleanup();
        }

        // [CONTEXT] 워크스페이스 전환 (예: /ns switch @개인)
        if (cleanQuery.startsWith('switch ') || cleanQuery.startsWith('전환 ')) {
            const ws = query.split(' ')[1];
            return this.setWorkspace(ws);
        }

        window.TerminalUI.appendLog('SYSTEM', `워크스페이스 전체에서 "${query}" 검색 중...`, true);

        if (window.NotionSearchWindow) {
            window.NotionSearchWindow.open(query);

            if (typeof window.speakTTS === 'function') {
                window.speakTTS(`워크스페이스 전체에서 "${query}" 검색 결과를 확인해 주세요.`, null, 'notion');
            }

            if (typeof window.dispatchAvatarEvent === 'function') {
                window.dispatchAvatarEvent('MOTION', { alias: 'joy' });
            }
        } else {
            window.TerminalUI.appendLog('ERROR', '❌ 검색창 모듈이 로드되지 않았습니다.');
        }
    },

    pendingMatches: [], // 정리 대기 항목 저장

    /**
     * Notion 규칙 기반 자동 정리 (/ns clean)
     */
    async handleCleanup() {
        window.TerminalUI.appendLog('SYSTEM', '노션 지식 베이스 정리 규칙을 검토 중입니다...', true);

        try {
            const res = await fetch('/api/notion/rules/evaluate');
            const result = await res.json();

            if (result.success && result.matches.length > 0) {
                this.pendingMatches = result.matches; // 상태 저장
                window.TerminalUI.appendLog('NOTION', `📋 **정리 대상 ${result.matches.length}건을 발견했습니다!**`);

                if (typeof window.speakTTS === 'function') {
                    window.speakTTS(`워크스페이스 정리가 필요한 항목 ${result.matches.length}건을 발견했습니다. 제안된 대로 분류를 진행할까요?`, null, 'notion');
                }

                // 터미널에 상세 내역 출력
                let output = "";
                result.matches.slice(0, 5).forEach((m, idx) => {
                    output += `${idx + 1}. [${m.rule_name}] "${m.title}" → ${m.action.target_value}\n`;
                });
                if (result.matches.length > 5) output += `...외 ${result.matches.length - 5}건 더 발견됨.\n`;

                window.TerminalUI.appendLog('SYSTEM', output);
                window.TerminalUI.appendLog('HELP', '실행하시려면 터미널에 **"/ns cleanup"** 또는 **"/ns 정리실행"**을 입력해 주세요.');
            } else {
                this.pendingMatches = [];
                window.TerminalUI.appendLog('NOTION', '✨ 현재 규칙에 따라 정리할 항목이 없이 깔끔한 상태입니다.');
                if (typeof window.speakTTS === 'function') {
                    window.speakTTS("검토 결과, 모든 항목이 이미 잘 분류되어 있습니다.", null, 'notion');
                }
            }
        } catch (err) {
            window.TerminalUI.appendLog('ERROR', `정리 검토 중 오류 발생: ${err.message}`);
        }
    },

    /**
     * 노션 정리 실제 적용 실행
     */
    async handleApplyCleanup() {
        if (!this.pendingMatches || this.pendingMatches.length === 0) {
            window.TerminalUI.appendLog('ERROR', '❌ 실행할 정리 항목이 없습니다. 먼저 "/ns clean"으로 검토해 주세요.');
            return;
        }

        const count = this.pendingMatches.length;
        window.TerminalUI.appendLog('SYSTEM', `${count}건의 항목에 대해 규칙 적용을 시작합니다...`, true);

        let successCount = 0;
        try {
            for (const match of this.pendingMatches) {
                const res = await fetch('/api/notion/rules/apply', {
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

            window.TerminalUI.appendLog('NOTION', `✅ 정리가 완료되었습니다! (총 ${count}건 중 ${successCount}건 성공)`);
            if (typeof window.speakTTS === 'function') {
                window.speakTTS(`워크스페이스 정리를 마쳤습니다. 총 ${successCount}개의 항목이 성공적으로 분류되었습니다.`, null, 'notion');
            }

            // 위젯 갱신
            if (typeof window.refreshNotionWidget === 'function') window.refreshNotionWidget();
            if (typeof window.dispatchAvatarEvent === 'function') {
                window.dispatchAvatarEvent('MOTION', { alias: 'joy' });
            }

            this.pendingMatches = []; // 초기화
        } catch (err) {
            window.TerminalUI.appendLog('ERROR', `작업 수행 중 오류 발생: ${err.message}`);
        }
    },

    /**
     * 기본 워크스페이스 컨텍스트 설정
     */
    setWorkspace(alias) {
        if (!alias) {
            this.currentWorkspace = null;
            window.TerminalUI.appendLog('SYSTEM', '기본 워크스페이스로 복귀했습니다.');
            return;
        }

        this.currentWorkspace = alias.startsWith('@') ? alias : '@' + alias;
        window.TerminalUI.appendLog('NOTION', `📍 컨텍스트가 **${this.currentWorkspace}** (으)로 전환되었습니다.`);
        window.TerminalUI.appendLog('HELP', `이제 모든 /memo 명령은 기본적으로 ${this.currentWorkspace}에 저장됩니다.`);

        if (typeof window.speakTTS === 'function') {
            window.speakTTS(`${this.currentWorkspace} 워크스페이스로 전환되었습니다.`, null, 'notion');
        }
    }
};
