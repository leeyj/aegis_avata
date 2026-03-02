/**
 * AEGIS Plugin-X Weather Widget (v1.5)
 */
export default {
    updateTimer: null,
    config: {
        font_size_temp: "24px",
        font_size_status: "16px",
        icon_size: "50px",
        update_interval_min: 10
    },

    init: async function (shadowRoot, context) {
        context.log("Weather Widget Initializing...");

        // 1. 설정 로드
        try {
            const res = await fetch('/api/plugins/weather/config');
            const serverConfig = await res.json();
            Object.assign(this.config, serverConfig);
        } catch (e) {
            context.log("Failed to load config, using defaults.");
        }

        // 2. DOM 요소 참조
        const statusEl = shadowRoot.getElementById('weather-status');
        const tempEl = shadowRoot.getElementById('weather-temp');
        const iconEl = shadowRoot.getElementById('weather-icon');

        const updateWeather = async () => {
            try {
                const res = await fetch('/api/plugins/weather/data');
                const data = await res.json();

                if (statusEl && data.status) {
                    // 시스템 번역 단축 함수 사용
                    const template = context._t('widgets.weather_template');
                    statusEl.innerText = template.replace('{city}', data.city).replace('{status}', data.status);
                    tempEl.innerText = data.temp;

                    statusEl.style.fontSize = this.config.font_size_status;
                    tempEl.style.fontSize = this.config.font_size_temp;

                    if (data.icon && iconEl) {
                        iconEl.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
                        iconEl.style.display = 'block';
                        iconEl.style.width = this.config.icon_size;
                        iconEl.style.height = this.config.icon_size;
                    }

                    context.triggerReaction('weather', data, 3600000);
                }
            } catch (e) {
                context.log("Error fetching weather data: " + e.message);
            }
        };

        // 3. 실행 및 인터벌 설정
        updateWeather();

        let tickCounter = 0;
        context.registerSchedule('weather', 'min', () => {
            tickCounter++;
            if (tickCounter >= this.config.update_interval_min) {
                updateWeather();
                tickCounter = 0;
            }
        });
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        console.log("[Plugin-X] Weather Widget Destroyed.");
    }
};
