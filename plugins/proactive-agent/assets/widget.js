/**
 * AEGIS Proactive Agent (v2.0 Briefing Controller)
 */
export default {
    config: { briefing_widgets: [] },

    init: async function (shadowRoot, context) {
        context.log("Proactive Agent Briefing Controller Initializing...");

        const pluginListEl = shadowRoot.getElementById('plugin-list');
        const saveBtn = shadowRoot.getElementById('save-config-btn');
        const saveStatus = shadowRoot.getElementById('save-status');

        // 1. Load Current Config
        const loadConfig = async () => {
            try {
                const res = await fetch('/api/plugins/proactive-agent/config');
                const data = await res.json();
                this.config.briefing_widgets = data.briefing_widgets || [];
            } catch (e) {
                console.error("[Proactive] Config load failed:", e);
            }
        };

        // 2. Fetch Active Plugins & Render
        const renderPlugins = async () => {
            try {
                const res = await fetch('/api/plugins/active');
                const plugins = await res.json();

                // 브리핑에서 제외할 시스템 플러그인들
                const excluded = ['title', 'sidebar', 'proactive-agent', 'terminal', 'studio', 'scheduler', 'unit-select'];

                pluginListEl.innerHTML = '';
                plugins.filter(p => !excluded.includes(p.id)).forEach(p => {
                    const isSelected = this.config.briefing_widgets.includes(p.id);
                    const item = document.createElement('div');
                    item.className = `plugin-item no-drag ${isSelected ? 'selected' : ''}`;
                    item.dataset.id = p.id;

                    // 아이콘 추출 (manifest.icon 또는 텍스트 기반 더미)
                    const icon = p.icon || "🧩";

                    item.innerHTML = `
                        <input type="checkbox" ${isSelected ? 'checked' : ''}>
                        <div class="icon">${icon}</div>
                        <div class="name">${p.name}</div>
                    `;

                    item.onclick = (e) => {
                        e.stopPropagation(); // 드래그 이벤트로 전파 차단
                        const cb = item.querySelector('input');
                        if (e.target !== cb) cb.checked = !cb.checked;
                        item.classList.toggle('selected', cb.checked);
                    };

                    // mousedown에서도 전파를 차단해야 드래그가 시작되지 않음
                    item.onmousedown = (e) => e.stopPropagation();

                    pluginListEl.appendChild(item);
                });
            } catch (e) {
                pluginListEl.innerHTML = '<div class="error">Failed to load plugins.</div>';
            }
        };

        // 3. Save Logic
        saveBtn.onclick = async () => {
            const selected = [];
            shadowRoot.querySelectorAll('.plugin-item input:checked').forEach(cb => {
                selected.push(cb.closest('.plugin-item').dataset.id);
            });

            saveBtn.disabled = true;
            saveBtn.innerText = "SAVING...";

            try {
                const res = await fetch('/api/plugins/proactive-agent/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ briefing_widgets: selected })
                });
                const result = await res.json();

                if (result.status === 'success') {
                    saveStatus.innerText = "Settings saved successfully!";
                    saveStatus.style.color = "#00ffaa";
                    this.config.briefing_widgets = selected;
                } else {
                    throw new Error(result.message);
                }
            } catch (e) {
                saveStatus.innerText = "Save failed: " + e.message;
                saveStatus.style.color = "#ff4444";
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerText = "SAVE SETTINGS";
                setTimeout(() => { saveStatus.innerText = ""; }, 3000);
            }
        };

        await loadConfig();
        await renderPlugins();
    },

    destroy: function () {
        console.log("[Plugin-X] Proactive Agent Controller Destroyed.");
    }
};
