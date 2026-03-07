/**
 * AEGIS Gmail Widget (v1.8.0 Plugin-X)
 */
export default {
    lastTopEmailId: null,
    updateTimer: null,
    config: { refresh_interval_min: 5 },

    init: async function (shadowRoot, context) {
        context.log("Gmail Widget Initializing...");
        const listEl = shadowRoot.getElementById('gmail-list');
        if (!listEl) return;

        // 1. 설정 로드
        try {
            const res = await fetch('/api/plugins/gmail/config');
            const serverConfig = await res.json();
            Object.assign(this.config, serverConfig);
        } catch (e) {
            context.log("Failed to load Gmail config.");
        }

        const updateGmail = async () => {
            try {
                const res = await fetch('/api/plugins/gmail/recent');
                const data = await res.json();

                if (data.status === "SUCCESS") {
                    if (data.emails.length === 0) {
                        listEl.innerHTML = '<div style="font-size: 12px; opacity: 0.5;">No recent messages.</div>';
                    } else {
                        const currentTopId = data.emails[0].id;
                        if (this.lastTopEmailId && this.lastTopEmailId !== currentTopId) {
                            let senderName = data.emails[0].from;
                            if (senderName.includes('<')) {
                                senderName = senderName.split('<')[0].replace(/"/g, '').trim();
                            }
                            // 아바카 리액션 트리거
                            context.triggerReaction('gmail', { sender: senderName, count: 1 });
                        }
                        this.lastTopEmailId = currentTopId;

                        listEl.innerHTML = '';
                        data.emails.forEach(email => {
                            const item = document.createElement('div');
                            item.className = "email-item";
                            item.innerHTML = `
                                <div class="sender">FROM: ${email.from}</div>
                                <div class="subject">${email.subject}</div>
                                <div class="snippet">${email.snippet}</div>
                            `;
                            listEl.appendChild(item);
                        });
                    }
                } else {
                    listEl.innerHTML = `<div class="status-msg">(Gmail: ${data.message || 'Connecting...'})</div>`;
                }
            } catch (e) {
                context.log("Gmail update failed: " + e.message);
            }
        };

        // 2. 실행
        updateGmail();

        // 3. 스케줄러 등록
        let tick = 0;
        context.registerSchedule('gmail', 'min', () => {
            tick++;
            if (tick >= this.config.refresh_interval_min) {
                updateGmail();
                tick = 0;
            }
        });

        // 4. 터미널 명령어 등록
        context.registerCommand('/gmail', () => {
            updateGmail();
            context.appendLog('GMAIL', '🔄 수신함을 새로고침합니다.');
        });
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        console.log("[Plugin-X] Gmail Widget Destroyed.");
    }
};
