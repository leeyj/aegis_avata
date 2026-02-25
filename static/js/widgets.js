/**
 * AEGIS Widgets - Entry Point
 * Orchestrates all widget modules.
 */

async function initWidgets() {
    // 1. Initial Configs
    try {
        const res = await fetch('/tts_config');
        const data = await res.json();
        if (typeof globalTtsConfig !== 'undefined') {
            Object.assign(globalTtsConfig, data);
        }
    } catch (e) { }

    // 1-1. Briefing Config
    if (typeof applyBriefingConfig === 'function') await applyBriefingConfig();

    // 2. Start all modules
    if (typeof startClock === 'function') startClock();
    if (typeof startWeather === 'function') startWeather();
    if (typeof initSystemUI === 'function') initSystemUI();
    if (typeof startFinance === 'function') startFinance();
    if (typeof startNews === 'function') startNews();
    if (typeof startCalendar === 'function') startCalendar();
    if (typeof startTodo === 'function') startTodo();
    if (typeof startGmail === 'function') startGmail();
    if (typeof initStockWidget === 'function') initStockWidget();

    // 3. Agent & YouTube Music Start
    if (typeof startProactiveAgent === 'function') startProactiveAgent();
    if (typeof startYouTubeMusic === 'function') startYouTubeMusic();
}
