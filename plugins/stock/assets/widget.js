/**
 * AEGIS Plugin-X Stock Analytics Widget (v1.0)
 */
export default {
    updateTimer: null,
    cooldown: 600000,
    config: { interval_min: 2, alert_threshold: 3.0, briefing_cooldown_min: 10 },

    init: async function (shadowRoot, context) {
        context.log("Stock Analytics Widget Initializing...");

        // 1. 설정 로드
        try {
            const res = await fetch('/api/plugins/stock/config');
            const data = await res.json();
            Object.assign(this.config, data);
            this.cooldown = (this.config.briefing_cooldown_min || 10) * 60 * 1000;
        } catch (e) { }

        const listContainer = shadowRoot.getElementById('stock-list');

        const updateStock = async () => {
            try {
                const res = await fetch('/api/plugins/stock/data');
                const data = await res.json();

                if (Object.keys(data).length === 0) {
                    if (listContainer) listContainer.innerHTML = '<div class="loading-text">No active tickers.</div>';
                    return;
                }

                let html = '';
                let readyToNotify = [];
                const threshold = this.config.alert_threshold || 3.0;

                // [Fix] 브리핑 허용 시간 체크 (HHmm 포맷)
                const now = new Date();
                const hhmm = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
                const startTime = this.config.bref_allow_start_time || "0900";
                const endTime = this.config.bref_allow_end_time || "1530";
                const isWorkTime = hhmm >= startTime && hhmm <= endTime;

                for (const [name, info] of Object.entries(data)) {
                    const statusClass = info.direction === 'up' ? 'up' : 'down';
                    const textClass = info.direction === 'up' ? 'up-text' : 'down-text';
                    const sign = info.direction === 'up' ? '▲' : '▼';

                    html += `
                        <div class="stock-item ${statusClass}">
                            <div class="stock-header">
                                <span class="stock-name">${name}</span>
                                <span class="stock-symbol">${info.symbol}</span>
                            </div>
                            <div class="stock-values">
                                <span class="price">${info.price}</span>
                                <span class="change_pct ${textClass}">${sign} ${info.change_pct}%</span>
                            </div>
                        </div>
                    `;

                    // 알림 기준 체크 (장 시간일 때만 허용)
                    if (isWorkTime && Math.abs(info.change_pct) >= threshold) {
                        if (!context.reaction.isCooldownActive('stock', this.cooldown, name)) {
                            readyToNotify.push({ name, ...info });
                        }
                    }
                }
                if (listContainer) listContainer.innerHTML = html;

                // 알림 트리거
                if (readyToNotify.length === 1) {
                    context.triggerReaction('stock', {
                        name: readyToNotify[0].name,
                        price: readyToNotify[0].price,
                        change_pct: readyToNotify[0].change_pct
                    }, this.cooldown);
                } else if (readyToNotify.length > 1) {
                    this.triggerBulkAlert(readyToNotify, context);
                }
            } catch (e) {
                context.log("Stock Update Error: " + e.message);
                if (listContainer) listContainer.innerHTML = '<div class="up-text">Sync Connection Refused</div>';
            }
        };

        // 2. 실행 및 인터벌 설정
        updateStock();

        let tickCounter = 0;
        context.registerSchedule('stock', 'min', () => {
            tickCounter++;
            if (tickCounter >= this.config.interval_min) {
                updateStock();
                tickCounter = 0;
            }
        });

        // [v3.0] 터미널 명령어 등록
        context.registerCommand('/stock', () => {
            updateStock();
            context.appendLog('STOCK', '📊 주식 포트폴리오 정보를 갱신합니다.');
        });
    },

    triggerBulkAlert: function (stocks, context) {
        const parts = stocks.map(s => {
            const verb = s.change_pct >= 0 ? context._t('directions.up') : context._t('directions.down');
            return `${s.name} ${Math.abs(s.change_pct).toFixed(1)}% ${verb}`;
        });

        const andWord = context._t('common.and') || " and ";
        const summary = parts.slice(0, -1).join(", ") + (parts.length > 1 ? andWord : "") + parts.slice(-1);

        context.triggerReaction('stock_bulk', {
            summary: summary,
            count: stocks.length
        }, this.cooldown);

        stocks.forEach(s => context.reaction.setCooldown('stock', s.name));
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        console.log("[Plugin-X] Stock Widget Destroyed.");
    }
};
