/**
 * AEGIS UI Sidebar Manager (v1.6.8)
 * Handles dynamic sidebar items for plugins and core actions.
 */

window.SidebarManager = {
    /**
     * 핵심 시스템 버튼들을 사이드바에 추가 (루틴 매니저 등)
     */
    addCoreSidebarItems: function () {
        const container = document.getElementById('sidebar-widgets-list');
        if (!container) return;

        // 특별한 처리가 필요한 코어 위젯이 있다면 여기서 추가
        // 현재는 PluginLoader가 모든 플러그인 리스트를 받아와 처리함
    },

    /**
     * 플러그인용 토글 스위치를 사이드바에 주입
     */
    addSidebarItem: function (manifest) {
        if (manifest.hidden || manifest.system_plugin) return; // Skip system-only or hidden plugins
        const list = document.getElementById('sidebar-widgets-list');
        if (!list) return;

        const item = document.createElement('div');
        item.className = 'sidebar-widget-item';
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.05);';

        const label = document.createElement('span');
        label.innerText = manifest.name;
        label.style.fontSize = '0.85rem';
        label.style.color = 'var(--neon)';

        // [Persistence] 가시성 상태에 따른 초기 체크박스 설정
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
        list.appendChild(item);
    }
};
