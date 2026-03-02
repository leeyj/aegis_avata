/**
 * AEGIS Plugin-X News Widget (v1.0)
 */
export default {
    updateTimer: null,
    rotateTimer: null,
    config: { update_interval_min: 30, rotate_interval_sec: 8 },
    newsItems: [],
    currentIndex: 0,

    init: async function (shadowRoot, context) {
        context.log("News Widget Initializing...");

        try {
            const res = await fetch('/api/plugins/news/config');
            const serverConfig = await res.json();
            Object.assign(this.config, serverConfig);
        } catch (e) { }

        const tickerEl = shadowRoot.getElementById('news-ticker');
        const briefBtn = shadowRoot.getElementById('ai-news-brief-btn');

        const updateNewsData = async () => {
            try {
                const res = await fetch('/api/plugins/news/latest');
                this.newsItems = await res.json();
                if (this.newsItems.length > 0) showNextNews();
            } catch (e) { }
        };

        const showNextNews = () => {
            if (this.newsItems.length === 0) return;
            const item = this.newsItems[this.currentIndex];
            tickerEl.style.opacity = 0;

            setTimeout(() => {
                tickerEl.innerHTML = `
                    <div class="news-provider">[${item.provider}]</div>
                    <a href="${item.link}" target="_blank" class="news-link">
                        ${item.title}
                    </a>
                `;
                tickerEl.style.opacity = 1;
                this.currentIndex = (this.currentIndex + 1) % this.newsItems.length;
            }, 500);
        };

        // AI 뉴스 브리핑 연동
        if (briefBtn) briefBtn.onclick = async () => {
            if (this.newsItems.length === 0) return;
            briefBtn.innerText = "⏳";
            try {
                // 시스템 AI 게이트웨이 호출
                const res = await context.askAI("news_summary", { items: this.newsItems });
                if (res.status === 'success') {
                    // [신규] 아바타 음성 출력 (v1.5)
                    if (res.audio_url) {
                        const audio = new Audio(res.audio_url);
                        audio.play().catch(e => context.log("Audio play failed: " + e));
                    }

                    // 리액션 트리거 (감정 표현)
                    const sentiment = res.result.sentiment || 'neutral';
                    context.triggerReaction('news', { sentiment });

                    context.log("AI Briefing Received: " + (res.result.briefing || res.result.response));
                }
            } catch (e) {
                context.log("AI Briefing Request Failed.");
            } finally {
                briefBtn.innerText = "🔊";
            }
        };

        // 실행 및 인터벌 설정
        updateNewsData();

        let updateCounter = 0;
        let showCounter = 0;
        context.registerSchedule('news_update', 'min', () => {
            updateCounter++;
            if (updateCounter >= this.config.update_interval_min) {
                updateNewsData();
                updateCounter = 0;
            }
        });

        context.registerSchedule('news_rotate', 'sec', () => {
            showCounter++;
            if (showCounter >= this.config.rotate_interval_sec) {
                showNextNews();
                showCounter = 0;
            }
        });
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        if (this.rotateTimer) clearInterval(this.rotateTimer);
        console.log("[Plugin-X] News Widget Destroyed.");
    }
};
