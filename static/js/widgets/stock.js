/**
 * AEGIS Stock Monitoring Widget
 * Handles real-time ticker tracking and alert triggering
 */

let stockInterval = null;
let stockCooldown = 600000; // 기본 10분

async function initStockWidget() {
    // console.log("[Stock] Initializing Ticker Monitor...");

    try {
        const configRes = await fetch('/ticker_config');
        const config = await configRes.json();
        const interval = (config.interval_min || 2) * 60 * 1000;
        const threshold = config.alert_threshold || 3.0;
        stockCooldown = (config.briefing_cooldown_min || 10) * 60 * 1000;

        // 초기 업데이트
        updateStockData(threshold);

        // 인터벌 설정
        if (stockInterval) clearInterval(stockInterval);
        stockInterval = setInterval(() => updateStockData(threshold), interval);

    } catch (e) {
        console.error("[Stock] Init Failed:", e);
    }
}

async function updateStockData(threshold) {
    const listContainer = document.getElementById('stock-list');
    if (!listContainer) return;

    try {
        const res = await fetch('/stock_data');
        const data = await res.json();

        if (window.logger) {
            window.logger.info(`[Stock] Monitoring data updated: ${Object.keys(data).join(', ')}`);
            console.log("[Stock] Received data:", data);
        }

        if (Object.keys(data).length === 0) {
            listContainer.innerHTML = '<div style="opacity:0.5; font-size:12px;">No active tickers.</div>';
            return;
        }

        let html = '';
        for (const [name, info] of Object.entries(data)) {
            const color = info.direction === 'up' ? '#ff4b4b' : '#32ff7e';
            const sign = info.direction === 'up' ? '▲' : '▼';

            html += `
                <div style="margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 4px; border-left: 2px solid ${color};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; font-family: 'Orbitron'; font-size: 13px;">${name}</span>
                        <span style="font-size: 10px; opacity: 0.5;">${info.symbol}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px;">
                        <span style="font-family: 'Orbitron'; font-size: 16px;">${info.price}</span>
                        <span style="color: ${color}; font-weight: 700; font-size: 12px;">${sign} ${info.change_pct}%</span>
                    </div>
                </div>
            `;

            // 알림 기준(threshold) 체크
            if (Math.abs(info.change_pct) >= threshold) {
                triggerStockAlert(name, info);
            }
        }
        listContainer.innerHTML = html;

    } catch (e) {
        console.error("[Stock] Update Failed:", e);
        listContainer.innerHTML = '<div style="color: #ff4b4b; font-size:12px;">Sync Error</div>';
    }
}

function triggerStockAlert(name, info) {
    // ReactionEngine을 통한 설정 기반 액션 실행
    if (window.reactionEngine) {
        window.reactionEngine.checkAndTrigger('stock', {
            name: name,
            price: info.price,
            change_pct: info.change_pct
        }, stockCooldown);
    }
}
