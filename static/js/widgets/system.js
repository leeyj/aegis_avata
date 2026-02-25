/**
 * AEGIS Widget Module - System UI
 */
async function initSystemUI() {
    try {
        const res = await fetch('/system_config');
        const config = await res.json();
        const main = document.getElementById('main-title'), sub = document.getElementById('sub-title');
        if (main && config.title) {
            main.innerText = config.title;
            if (config.title_font_size) main.style.fontSize = config.title_font_size;
            if (config.title_color) main.style.color = config.title_color;
        }
        if (sub && config.subtitle) {
            sub.innerText = config.subtitle;
            if (config.subtitle_font_size) sub.style.fontSize = config.subtitle_font_size;
        }
    } catch (e) { }
}
