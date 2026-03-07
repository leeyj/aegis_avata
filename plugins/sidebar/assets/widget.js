/**
 * AEGIS Sidebar Plugin (v2.4 - Floating Design)
 * Ported from core to Plugin-X isolated architecture.
 */

export default {
    init: async function (shadowRoot, context) {
        context.log("Sidebar Agent initializing...");

        const panel = shadowRoot.getElementById('sidebar-panel');
        const widgetList = shadowRoot.getElementById('sidebar-widgets-list');
        const lockBtn = shadowRoot.getElementById('lock-toggle-btn');
        const routineBtn = shadowRoot.getElementById('routine-manager-btn');
        const saveBtn = shadowRoot.getElementById('save-settings-btn');
        const langSelector = shadowRoot.getElementById('language-selector');

        // --- 1. Capability: Sidebar Registration Service ---
        // We override the global SidebarManager to use THIS plugin's UI
        window.SidebarManager = {
            addSidebarItem: (manifest) => {
                if (manifest.hidden || manifest.system_plugin || manifest.id === 'sidebar') return;

                const item = document.createElement('div');
                item.className = 'sidebar-widget-item';

                const label = document.createElement('span');
                label.innerText = manifest.name;

                const isCurrentlyVisible = window.panelVisibility ? (window.panelVisibility[manifest.id] !== false) : true;

                const toggle = document.createElement('label');
                toggle.className = 'switch';
                toggle.innerHTML = `
                    <input type="checkbox" id="toggle-${manifest.id}" ${isCurrentlyVisible ? 'checked' : ''}>
                    <span class="slider round"></span>
                `;

                const checkbox = toggle.querySelector('input');
                checkbox.onchange = (e) => {
                    const isVisible = e.target.checked;
                    const widgetEl = document.getElementById(manifest.id);
                    if (widgetEl) {
                        widgetEl.style.display = isVisible ? 'block' : 'none';
                        if (window.panelVisibility) {
                            window.panelVisibility[manifest.id] = isVisible;
                            if (window.saveSettings) window.saveSettings();
                        }
                    }
                };

                item.appendChild(label);
                item.appendChild(toggle);
                widgetList.appendChild(item);
            }
        };

        // --- 2. 초기화 전에 이미 로드된 플러그인 복구 ---
        if (window.PluginLoader && window.PluginLoader.activePlugins) {
            for (const pluginData of window.PluginLoader.activePlugins.values()) {
                if (pluginData.manifest) {
                    window.SidebarManager.addSidebarItem(pluginData.manifest);
                }
            }
        }

        // --- 3. Core Actions Integration ---
        if (lockBtn) {
            lockBtn.onclick = () => {
                if (typeof window.toggleWidgetLock === 'function') window.toggleWidgetLock();
                this.updateLockLabel(lockBtn, context);
            };
            this.updateLockLabel(lockBtn, context);
        }

        if (routineBtn) {
            routineBtn.onclick = () => {
                if (typeof window.openSchedulerManager === 'function') window.openSchedulerManager();
            };
        }

        if (saveBtn) {
            saveBtn.onclick = async () => {
                if (window.persistToServer) {
                    const ok = await window.persistToServer();
                    if (ok) alert(context._t('sidebar.sync_success') || "Settings Saved.");
                }
            };
        }

        // --- 4. Sidebar Visibility Control ---
        const toggleSidebar = () => {
            const isVisible = panel.style.display === 'block';
            panel.style.display = isVisible ? 'none' : 'block';

            // 버튼 텍스트 업데이트
            if (mainToggleBtn) {
                mainToggleBtn.innerText = isVisible ? '•••' : '✕';
            }

            if (!isVisible) {
                panel.style.zIndex = "2500";
            }
        };

        window.toggleSidebar = toggleSidebar;

        // Connect to the core's toggle button (it's in the main document)
        const mainToggleBtn = document.getElementById('sidebar-toggle');
        if (mainToggleBtn) {
            mainToggleBtn.onclick = toggleSidebar;
        }

        // --- 5. Language Selector Porting (Dropdown) ---
        this.initLangSelector(langSelector, context);

        // --- 6. Studio Menu Recovery ---
        const studioContainer = shadowRoot.getElementById('studio-link-container');
        context.log(`[Diagnostic] Sponsor Status: ${window.IS_SPONSOR}`);
        if (studioContainer && window.IS_SPONSOR) {
            const studioLink = document.createElement('a');
            studioLink.href = '/studio';
            studioLink.className = 'sidebar-btn studio';
            studioLink.setAttribute('data-i18n', 'sidebar.studio');
            studioLink.innerText = 'LIVE2D STUDIO';
            studioContainer.appendChild(studioLink);
        }

        // --- 7. UI Drag & Scroll Protection ---
        if (window.initSinglePanelDragging) {
            window.initSinglePanelDragging(panel);
        }

        // [BUGFIX] Wheel event propagation stop to prevent avatar zooming
        panel.addEventListener('wheel', (e) => e.stopPropagation(), { passive: false });

        // Apply translations
        context.applyI18n();
    },

    updateLockLabel(btn, context) {
        const isLocked = window.uiLocked || false;
        btn.innerText = isLocked ?
            (context._t('sidebar.unlock_widgets') || "UNLOCK WIDGETS") :
            (context._t('sidebar.lock_widgets') || "LOCK WIDGETS");
        btn.style.borderColor = isLocked ? "#ff4444" : "";
    },

    /**
     * 언어 선택기를 드롭다운(Select) 형식으로 동적 로드
     */
    async initLangSelector(container, context) {
        if (!window.I18nManager || !container) return;

        try {
            const res = await fetch('/api/i18n/list');
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
                if (langObj.code === window.currentLang) opt.selected = true;
                select.appendChild(opt);
            });

            select.onchange = (e) => window.I18nManager.setLanguage(e.target.value);
            container.innerHTML = '';
            container.appendChild(select);
        } catch (e) {
            context.log("Failed to load language list.");
        }
    }
};
