/**
 * AEGIS Weather Theme Engine
 * Dynamically updates background and effects based on current weather
 */

function initWeatherTheme() {
    updateWeatherTheme();

    if (window.briefingScheduler) {
        let updateCounter = 0;
        window.briefingScheduler.registerWidget('weather_theme_update', 'min', () => {
            updateCounter++;
            if (updateCounter >= 30) { // 30분 주기
                updateWeatherTheme();
                updateCounter = 0;
            }
        });
    } else {
        setInterval(updateWeatherTheme, 1800000);
    }
}

async function updateWeatherTheme() {
    try {
        const res = await fetch('/weather_data');
        const data = await res.json();

        if (!data || data.status === 'ERROR') return;

        applyTheme(data.status);
    } catch (e) {
        console.error("[WeatherTheme] Failed to update:", e);
    }
}

function applyTheme(status) {
    const effects = document.getElementById('weather-effects');
    if (!effects) return;

    effects.innerHTML = ''; // 이전 효과 제거

    switch (status) {
        case 'SUNNY':
            break;
        case 'RAINY':
            createParticles(effects, 100, 'rain');
            break;
        case 'CLOUDY':
            break;
        case 'STORM':
            createParticles(effects, 150, 'rain');
            startLightning(effects);
            break;
        case 'SNOWY':
            createParticles(effects, 50, 'snow');
            break;
    }
}

function createParticles(container, count, type) {
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 0.5 + Math.random() * 1.5;

        if (type === 'rain') {
            p.className = 'rain-drop';
            p.style.left = `${left}%`;
            p.style.animationDelay = `${delay}s`;
            p.style.animationDuration = `${duration}s`;
        } else if (type === 'snow') {
            p.className = 'snow-flake';
            p.style.left = `${left}%`;
            const size = 2 + Math.random() * 4;
            p.style.width = `${size}px`;
            p.style.height = `${size}px`;
            p.style.animationDelay = `${delay}s`;
            p.style.animationDuration = `${3 + Math.random() * 4}s`;
        }
        container.appendChild(p);
    }
}

function startLightning(element) {
    if (window.briefingScheduler) {
        window.briefingScheduler.registerWidget('weather_lightning', 'sec', () => {
            if (Math.random() > 0.95) {
                element.style.filter = 'brightness(3)';
                setTimeout(() => {
                    element.style.filter = 'brightness(1)';
                }, 100);
            }
        });
    } else {
        setInterval(() => {
            if (Math.random() > 0.95) {
                element.style.filter = 'brightness(3)';
                setTimeout(() => {
                    element.style.filter = 'brightness(1)';
                }, 100);
            }
        }, 2000);
    }
}

// 글로벌 초기화
document.addEventListener('DOMContentLoaded', initWeatherTheme);
