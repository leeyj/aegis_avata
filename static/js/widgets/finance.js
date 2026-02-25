/**
 * AEGIS Widget Module - Finance (Market Indices)
 */
async function startFinance() {
    const listEl = document.getElementById('finance-list');
    if (!listEl) return;

    let config = { update_interval_min: 5 };
    try {
        const resConfig = await fetch('/finance_config');
        config = await resConfig.json();
    } catch (e) { }

    const updateFinance = async () => {
        try {
            const res = await fetch('/market_indices');
            const data = await res.json();

            if (window.logger) {
                window.logger.info(`[Finance] Market indices updated: ${Object.keys(data).join(', ')}`);
                console.log("[Finance] Received data:", data);
            }

            if (Object.keys(data).length > 0) {
                listEl.innerHTML = '';
                for (const [name, info] of Object.entries(data)) {
                    const color = info.direction === 'up' ? '#ff4b4b' : '#4b89ff';
                    const icon = info.direction === 'up' ? '▲' : '▼';

                    const item = document.createElement('div');
                    item.className = 'menu-item finance-item';
                    item.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
                    item.style.padding = '10px 0';
                    item.style.cursor = 'pointer';
                    item.style.transition = 'all 0.2s';
                    item.title = 'Click: Voice Briefing / Ctrl+Click: Open Details';

                    item.onmouseover = () => { item.style.background = 'rgba(0, 242, 255, 0.05)'; };
                    item.onmouseout = () => { item.style.background = 'transparent'; };

                    item.onclick = (e) => {
                        if (e.ctrlKey) {
                            const tickers = config.tickers || {};
                            const symbol = tickers[name];
                            if (symbol) {
                                window.open(`https://finance.yahoo.com/quote/${symbol}`, '_blank');
                            }
                        } else {
                            // 일반 클릭 시: 음성 안내 및 시각적 효과
                            item.style.background = 'rgba(0, 242, 255, 0.2)';
                            setTimeout(() => { item.style.background = 'transparent'; }, 300);

                            if (window.reactionEngine) {
                                window.reactionEngine.checkAndTrigger('finance', {
                                    name: name,
                                    price: info.price,
                                    change_pct: info.change_pct,
                                    direction_text: info.direction === 'up' ? '상승' : '하락'
                                }, 0);
                            }
                            // 데이터 즉시 갱신 (선택 사항)
                            updateFinance();
                        }
                    };

                    item.innerHTML = `
                        <div style="font-weight: 700;">${name}</div>
                        <div style="text-align: right;">
                            <div style="font-size: 16px; font-family: 'Orbitron';">${info.price}</div>
                            <div style="font-size: 11px; color: ${color};">${icon} ${info.change} (${info.change_pct})</div>
                        </div>
                    `;
                    listEl.appendChild(item);
                }
            }
        } catch (e) {
            console.error("[Finance] Update Error:", e);
            if (window.logger) window.logger.error("[Finance] Fetch Exception", e);
        }
    };

    updateFinance();
    const refreshMs = (config.update_interval_min || 1) * 60 * 1000;
    setInterval(updateFinance, refreshMs);
}
