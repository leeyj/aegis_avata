/**
 * AEGIS Widget Module - Gmail
 */
let lastTopEmailId = null;

async function startGmail() {
    const listEl = document.getElementById('gmail-list');
    if (!listEl) return;

    let config = { refresh_interval_min: 5 };
    try {
        const resConfig = await fetch('/google_config');
        config = Object.assign(config, await resConfig.json());
    } catch (e) { }

    const updateGmail = async () => {
        try {
            const res = await fetch('/recent_emails');
            const data = await res.json();

            if (data.status === "SUCCESS") {
                if (data.emails.length === 0) {
                    listEl.innerHTML = '<div style="font-size: 12px; opacity: 0.5;">No recent emails.</div>';
                } else {
                    const currentTopId = data.emails[0].id;
                    if (lastTopEmailId && lastTopEmailId !== currentTopId) {
                        // 새로운 메일 도착 알림 (발송자 이름 추출)
                        let senderName = data.emails[0].from;
                        if (senderName.includes('<')) {
                            senderName = senderName.split('<')[0].replace(/"/g, '').trim();
                        }

                        if (window.reactionEngine) {
                            window.reactionEngine.checkAndTrigger('gmail', {
                                sender: senderName,
                                count: 1
                            });
                        }
                    }
                    lastTopEmailId = currentTopId;
                    listEl.innerHTML = '';
                    data.emails.forEach(email => {
                        const item = document.createElement('div');
                        item.style.marginBottom = '12px';
                        item.style.paddingBottom = '8px';
                        item.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
                        item.innerHTML = `
                            <div style="font-size: 10px; color: var(--neon); opacity: 0.7; margin-bottom: 2px;">FROM: ${email.from}</div>
                            <div style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${email.subject}</div>
                            <div style="font-size: 11px; opacity: 0.5; margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${email.snippet}</div>
                        `;
                        listEl.appendChild(item);
                    });
                }
            } else {
                listEl.innerHTML = `<div style="font-size: 11px; opacity: 0.5;">(Gmail status: ${data.message || 'Waiting'})</div>`;
            }
        } catch (e) { }
    };

    updateGmail();

    if (window.briefingScheduler) {
        let tickCounter = 0;
        const intervalMin = config.refresh_interval_min || 5;

        window.briefingScheduler.registerWidget('gmail', 'min', () => {
            tickCounter++;
            if (tickCounter >= intervalMin) {
                updateGmail();
                tickCounter = 0;
            }
        });
    } else {
        const refreshMs = (config.refresh_interval_min || 5) * 60 * 1000;
        setInterval(updateGmail, refreshMs);
    }
}
