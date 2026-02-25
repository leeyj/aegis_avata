/**
 * AEGIS Widget Module - Weather
 */
async function startWeather() {
    let config = { font_size_temp: "24px", font_size_status: "16px", icon_size: "50px" };
    try {
        const res = await fetch('/weather_config');
        config = await res.json();
    } catch (e) { }

    const updateWeather = async () => {
        try {
            const res = await fetch('/weather');
            const data = await res.json();
            const statusEl = document.getElementById('weather-status'), tempEl = document.getElementById('weather-temp'), iconEl = document.getElementById('weather-icon');

            if (statusEl && data.status) {
                statusEl.innerText = `${data.status} In ${data.city}`;
                tempEl.innerText = data.temp;
                statusEl.style.fontSize = config.font_size_status;
                tempEl.style.fontSize = config.font_size_temp;
                if (data.icon && iconEl) {
                    iconEl.src = `http://openweathermap.org/img/wn/${data.icon}@2x.png`;
                    iconEl.style.display = 'block';
                    iconEl.style.width = config.icon_size; iconEl.style.height = config.icon_size;
                }
            }

            // 날씨 변화에 따른 아바타 반응 (ReactionEngine 적용)
            if (window.reactionEngine) {
                window.reactionEngine.checkAndTrigger('weather', data, 3600000); // 1시간 쿨다운 (빈번한 모션 방지)
            }
        } catch (e) { }
    };

    updateWeather();
    const refreshMs = (config.update_interval_min || 10) * 60 * 1000;
    setInterval(updateWeather, refreshMs);
}
