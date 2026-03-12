/**
 * AEGIS Plugin-X Finance Widget (v1.1)
 */
export default {
    updateTimer: null,
    config: { update_interval_min: 5, tickers: {} },

    init: async function (root, context) {
        context.log("Finance Widget Initializing...");

        // 1. 설정 로드
        try {
            const res = await fetch('/api/plugins/finance/config');
            const serverConfig = await res.json();
            Object.assign(this.config, serverConfig);
        } catch (e) {
            context.log("Failed to load config.");
        }

        const listEl = root.getElementById('finance-list');

        const updateFinance = async () => {
            try {
                const res = await fetch('/api/plugins/finance/indices');
                const data = await res.json();

                if (Object.keys(data).length > 0) {
                    listEl.innerHTML = '';
                    for (const [name, info] of Object.entries(data)) {
                        const upClass = info.direction === 'up' ? 'up' : 'down';
                        const icon = info.direction === 'up' ? '▲' : '▼';

                        const item = document.createElement('div');
                        item.className = 'finance-item';
                        item.title = context._t('widgets.finance_tip') || 'Click: Briefing / Ctrl+Click: Open Yahoo';

                        item.onclick = (e) => {
                            if (e.ctrlKey) {
                                const symbol = this.config.tickers[name];
                                if (symbol) window.open(`https://finance.yahoo.com/quote/${symbol}`, '_blank');
                            } else {
                                item.style.background = 'rgba(0, 242, 255, 0.2)';
                                setTimeout(() => { item.style.background = ''; }, 300);

                                context.triggerReaction('finance', {
                                    name: name,
                                    price: info.price,
                                    change_pct: info.change_pct,
                                    direction_text: context._t(`directions.${info.direction}`)
                                }, 0);
                                updateFinance();
                            }
                        };

                        item.innerHTML = `
                            <div class="finance-name">${name}</div>
                            <div class="finance-values">
                                <div class="price">${info.price}</div>
                                <div class="change ${upClass}">${icon} ${info.change} (${info.change_pct})</div>
                            </div>
                        `;
                        listEl.appendChild(item);
                    }
                }
            } catch (e) {
                context.log("Update Error: " + e.message);
            }
        };

        // 2. 실행 및 인터벌 설정
        updateFinance();

        let tickCounter = 0;
        context.registerSchedule('finance', 'min', () => {
            tickCounter++;
            if (tickCounter >= this.config.update_interval_min) {
                updateFinance();
                tickCounter = 0;
            }
        });

        // [v3.0] 터미널 명령어 등록
        context.registerCommand('/finance', () => {
            updateFinance();
            context.appendLog('FINANCE', '📈 주요 지수 정보를 업데이트합니다.');
        });
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        console.log("[Plugin-X] Finance Widget Destroyed.");
    }
};
