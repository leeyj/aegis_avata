/**
 * AEGIS Widget Module - News (RSS)
 */
async function startNews() {
    const tickerEl = document.getElementById('news-ticker');
    if (!tickerEl) return;

    let config = { update_interval: 1800000 };
    let newsItems = [];
    let currentIndex = 0;

    try {
        const resConfig = await fetch('/news_config');
        config = await resConfig.json();
    } catch (e) { }

    const updateNewsData = async () => {
        try {
            const res = await fetch('/latest_news');
            newsItems = await res.json();
            if (newsItems.length > 0) showNextNews();
        } catch (e) { }
    };

    const showNextNews = () => {
        if (newsItems.length === 0) return;
        const item = newsItems[currentIndex];
        tickerEl.style.opacity = 0;

        setTimeout(() => {
            tickerEl.innerHTML = `
                <div style="color: var(--neon); font-size: 10px; margin-bottom: 2px;">[${item.provider}]</div>
                <a href="${item.link}" target="_blank" style="color: white; text-decoration: none; font-weight: 500;">
                    ${item.title}
                </a>
            `;
            tickerEl.style.opacity = 1;
            currentIndex = (currentIndex + 1) % newsItems.length;
        }, 500);
    };

    updateNewsData();

    if (window.briefingScheduler) {
        let updateCounter = 0;
        let showCounter = 0;
        const updateIntervalMin = config.update_interval_min || 30;

        window.briefingScheduler.registerWidget('news_update', 'min', () => {
            updateCounter++;
            if (updateCounter >= updateIntervalMin) {
                updateNewsData();
                updateCounter = 0;
            }
        });

        window.briefingScheduler.registerWidget('news_rotate', 'sec', () => {
            showCounter++;
            if (showCounter >= 8) { // 8초마다 뉴스 회전
                showNextNews();
                showCounter = 0;
            }
        });
    } else {
        const refreshMs = (config.update_interval_min || 30) * 60 * 1000;
        setInterval(updateNewsData, refreshMs);
        setInterval(showNextNews, 8000);
    }
}
