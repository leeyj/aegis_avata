/**
 * AEGIS Sidebar Plugin (v2.4 - Floating Design)
 * Ported from core to Plugin-X isolated architecture.
 */

export default {
    init: async function (root, context) {
        context.log("Sidebar Agent initializing...");

        const panel = root.getElementById('sidebar-panel');
        const widgetList = root.getElementById('sidebar-widgets-list');
        const lockBtn = root.getElementById('lock-toggle-btn');
        const routineBtn = root.getElementById('routine-manager-btn');
        const saveBtn = root.getElementById('save-settings-btn');
        const langSelector = root.getElementById('language-selector');

        // --- 1. Capability: Sidebar Registration Service (v4.0 Abstracted) ---
        this.context = context;
        this.root = root;
        this.widgetList = widgetList;

        const systemState = await context.getSystemState();

        const addSidebarItem = (manifest) => {
            if (manifest.hidden || manifest.system_plugin || manifest.id === 'sidebar' || manifest.id === 'studio') return;
            if (root.getElementById(`toggle-${manifest.id}`)) return; // Avoid duplicates

            const item = document.createElement('div');
            item.className = 'sidebar-widget-item';

            const label = document.createElement('span');
            label.innerText = manifest.name;

            // In v4.0, we fetch state via broker
            const isCurrentlyVisible = systemState.panelVisibility ? (systemState.panelVisibility[manifest.id] !== false) : true;

            const toggle = document.createElement('label');
            toggle.className = 'switch';
            toggle.innerHTML = `
                <input type="checkbox" id="toggle-${manifest.id}" ${isCurrentlyVisible ? 'checked' : ''}>
                <span class="slider round"></span>
            `;

            const checkbox = toggle.querySelector('input');
            checkbox.onchange = (e) => {
                const isVisible = e.target.checked;
                // [v4.0] Request Core to toggle widget visibility
                context.requestCore('WIDGET_VISIBILITY_CHANGED', { id: manifest.id, visible: isVisible });
            };

            item.appendChild(label);
            item.appendChild(toggle);
            widgetList.appendChild(item);
        };

        // Unified Message Listener for new plugins
        context.on('PLUGIN_LOADED', (manifest) => addSidebarItem(manifest));

        // Initial Load
        const activePlugins = await context.requestCore('GET_ACTIVE_PLUGINS');
        if (activePlugins) {
            activePlugins.forEach(manifest => addSidebarItem(manifest));
        }

        // --- 3. Core Actions Integration (Broker-based) ---
        if (lockBtn) {
            lockBtn.onclick = async () => {
                const res = await context.requestCore('TOGGLE_LOCK');
                if (res) this.updateLockLabel(lockBtn, context, res.isLocked);
            };
            this.updateLockLabel(lockBtn, context, systemState.isLocked);
        }

        if (routineBtn) {
            routineBtn.onclick = () => {
                context.requestCore('OPEN_SCHEDULER');
            };
        }

        if (saveBtn) {
            saveBtn.onclick = async () => {
                const res = await context.requestCore('SAVE_SETTINGS');
                if (res?.success) alert(context._t('sidebar.sync_success') || "Settings Saved.");
            };
        }

        // --- 4. Sidebar Visibility Control ---
        // Main toggle button is actually on the PARENT side for Sidebar Level 1
        // but we can request Core to handle it. Actually, for Sidebar Level 2, 
        // the button should be inside the iframe or Core handles the iframe frame.
        // [v4.0] Assume Core manages the Sidebar Iframe expansion/collapse.

        // --- 5. Language Selector Porting (Dropdown) ---
        this.initLangSelector(langSelector, context, systemState);

        // --- 6. Studio Menu Recovery (v4.2 Window Target) ---
        const studioContainer = root.getElementById('studio-link-container');
        if (studioContainer && systemState.isSponsor) {
            const studioBtn = document.createElement('button');
            studioBtn.className = 'sidebar-btn studio';
            studioBtn.setAttribute('data-i18n', 'sidebar.studio');
            studioBtn.innerText = 'LIVE2D STUDIO';
            studioBtn.onclick = () => {
                context.requestCore('WIDGET_VISIBILITY_CHANGED', { id: 'studio', visible: true });
            };
            studioContainer.appendChild(studioBtn);
        }

        // Apply translations
        context.applyI18n();
    },

    updateLockLabel(btn, context, isLocked) {
        btn.innerText = isLocked ?
            (context._t('sidebar.unlock_widgets') || "UNLOCK WIDGETS") :
            (context._t('sidebar.lock_widgets') || "LOCK WIDGETS");
        btn.style.borderColor = isLocked ? "#ff4444" : "";
    },

    /**
     * 언어 선택기를 드롭다운(Select) 형식으로 동적 로드
     */
    async initLangSelector(container, context, systemState) {
        if (!container) return;

        try {
            const res = await context.fetch('/api/i18n/list');
            const langs = await res.json();

            const select = document.createElement('select');
            select.className = 'sidebar-select';
            select.style.cssText = `
                width: 100%;
                padding: 10px;
                background: rgba(0, 242, 255, 0.05);
                border: 1px solid rgba(0, 242, 255, 0.3);
                color: var(--neon);
                border-radius: 8px;
                font-family: 'Orbitron', sans-serif;
                font-size: 0.8rem;
                cursor: pointer;
                outline: none;
            `;

            langs.forEach(langObj => {
                const opt = document.createElement('option');
                opt.value = langObj.code;
                opt.innerText = langObj.name;
                opt.style.background = "#1a1a1a";
                if (langObj.code === systemState.currentLang) opt.selected = true;
                select.appendChild(opt);
            });

            select.onchange = (e) => context.requestCore('CHANGE_LANGUAGE', { lang: e.target.value });
            container.innerHTML = '';
            container.appendChild(select);
        } catch (e) {
            context.log("Failed to load language list.");
        }
    }
};
