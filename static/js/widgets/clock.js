/**
 * AEGIS Widget Module - Clock & Trading Profit
 */
async function startClock() {
    const clockEl = document.getElementById('clock');
    if (!clockEl) return;

    let config = { format: "HH:mm:ss", font_size: "32px" };
    try {
        const res = await fetch('/clock_config');
        config = await res.json();
    } catch (e) { }

    clockEl.style.fontSize = config.font_size;
    if (config.color) clockEl.style.color = config.color;

    const updateTime = (now) => {
        const year = now.getFullYear(), month = String(now.getMonth() + 1).padStart(2, '0'), day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0'), minutes = String(now.getMinutes()).padStart(2, '0'), seconds = String(now.getSeconds()).padStart(2, '0');

        let str = config.format || "HH:mm:ss";
        str = str.replace(/YYYY/g, year).replace(/MM/g, month).replace(/DD/g, day).replace(/HH/g, hours).replace(/mm/g, minutes).replace(/ss/g, seconds).replace(/SS/g, seconds);
        clockEl.innerHTML = str.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
    };

    if (window.briefingScheduler) {
        window.briefingScheduler.registerWidget('clock', 'sec', updateTime);
    } else {
        updateTime(new Date());
        setInterval(() => updateTime(new Date()), 1000);
    }
}
