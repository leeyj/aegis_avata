/**
 * AEGIS Weather Dynamics Manager
 * Handles real-time visual effects like rain, snow, and lightning.
 */

window.WeatherEffects = {
    activeEffect: null,
    timers: [],
    container: null,

    init: function () {
        this.container = document.getElementById('weather-effects');
        if (!this.container) {
            console.error("[WeatherEffects] Container #weather-effects not found.");
            return;
        }
        console.log("[WeatherEffects] Manager initialized.");
    },

    /**
     * 전역 날씨 효과 적용
     * @param {string} type 'RAIN', 'SNOW', 'STORM', 'CLEAR'
     */
    apply: function (type) {
        if (this.activeEffect === type) return;

        this.clear();
        this.activeEffect = type;

        if (type === 'RAINY' || type === 'STORM') {
            this.startRain();
            if (type === 'STORM') this.startLightning();
        } else if (type === 'SNOWY') {
            this.startSnow();
        }

        console.log(`[WeatherEffects] Applied effect: ${type}`);
    },

    clear: function () {
        this.activeEffect = null;
        this.timers.forEach(t => clearInterval(t));
        this.timers = [];
        if (this.container) this.container.innerHTML = '';
    },

    startRain: function () {
        const createDrop = () => {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = Math.random() * 100 + 'vw';
            drop.style.opacity = Math.random();
            drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';

            this.container.appendChild(drop);
            setTimeout(() => drop.remove(), 2000);
        };

        const timer = setInterval(createDrop, 50);
        this.timers.push(timer);
    },

    startSnow: function () {
        const createFlake = () => {
            const flake = document.createElement('div');
            flake.className = 'snow-flake';
            const size = (Math.random() * 5 + 2) + 'px';
            flake.style.width = size;
            flake.style.height = size;
            flake.style.left = Math.random() * 100 + 'vw';
            flake.style.opacity = Math.random();
            flake.style.animationDuration = (Math.random() * 3 + 2) + 's';

            this.container.appendChild(flake);
            setTimeout(() => flake.remove(), 5000);
        };

        const timer = setInterval(createFlake, 200);
        this.timers.push(timer);
    },

    startLightning: function () {
        const flashInstance = document.createElement('div');
        flashInstance.className = 'lightning-flash';
        this.container.appendChild(flashInstance);

        const timer = setInterval(() => {
            if (Math.random() > 0.95) {
                flashInstance.classList.add('animate-flash');
                setTimeout(() => flashInstance.classList.remove('animate-flash'), 200);
            }
        }, 1000);
        this.timers.push(timer);
    }
};

// Global Hook
window.applyWeatherEffect = (type) => {
    if (window.WeatherEffects) {
        window.WeatherEffects.apply(type);
    }
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    window.WeatherEffects.init();
});
