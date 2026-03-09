/**
 * Plugin Renderer
 * Handles DOM wrapping, Shadow DOM attachment, and Asset Hydration.
 */
import { pluginContext } from './plugin_context.js';

export const pluginRenderer = {
    /**
     * 위젯 래퍼 상자 생성
     */
    createWrapper: function (manifest) {
        try {
            const container = document.getElementById('ui-layer');
            if (!container) return null;

            const wrapper = document.createElement('div');
            wrapper.id = manifest.id;

            if (!manifest.layout?.fixed) {
                wrapper.className = 'glass-panel widget-panel';
                if (manifest.layout?.default_size) {
                    wrapper.classList.add(manifest.layout.default_size);
                }
            } else {
                wrapper.className = 'fixed-plugin-wrapper';
            }

            if (window.panelVisibility && window.panelVisibility[manifest.id] === false) {
                wrapper.style.display = 'none';
            }

            wrapper.attachShadow({ mode: 'open' });

            if (manifest.layout?.zIndex) {
                wrapper.style.zIndex = manifest.layout.zIndex;
            }

            if (manifest.layout?.fixed) {
                Object.assign(wrapper.style, {
                    position: 'fixed', top: '0', left: '0',
                    width: '100vw', height: '100vh', margin: '0', padding: '0',
                    pointerEvents: 'none'
                });
                wrapper.classList.add('fixed-plugin');
            } else {
                if (window.initSinglePanelDragging) window.initSinglePanelDragging(wrapper);
                if (window.uiPositions && window.uiPositions[manifest.id]) {
                    const pos = window.uiPositions[manifest.id];
                    if (pos.leftRatio !== undefined) wrapper.style.left = (pos.leftRatio * window.innerWidth) + "px";
                    if (pos.topRatio !== undefined) wrapper.style.top = (pos.topRatio * window.innerHeight) + "px";
                    if (pos.width) wrapper.style.width = pos.width;
                    if (pos.height) wrapper.style.height = pos.height;
                } else {
                    const count = document.querySelectorAll('.widget-panel').length;
                    wrapper.style.left = (100 + (count * 40)) + "px";
                    wrapper.style.top = (100 + (count * 40)) + "px";
                }
                wrapper.style.position = 'absolute';
            }

            if (window.uiLocked) wrapper.classList.add('locked');

            if (manifest.hidden) {
                wrapper.style.display = 'none';
                wrapper.classList.add('hidden-service');
            }

            container.appendChild(wrapper);
            return wrapper;
        } catch (e) {
            console.error(`[PluginRenderer] Wrapper creation failed for ${manifest.id}:`, e);
            return null;
        }
    },

    /**
     * 플러그인 자산 주입 및 초기화
     */
    hydrate: async function (manifest, wrapper, bundle, activePlugins) {
        try {
            const shadow = wrapper.shadowRoot;
            if (!shadow) return;

            let html = '';
            let css = '';
            let jsSource = null;
            const bundled = bundle ? bundle[manifest.id] : null;

            if (bundled) {
                html = bundled.html || '';
                css = bundled.css || '';
                jsSource = bundled.js || null;
            } else {
                if (manifest.entry.html) html = await fetch(manifest.entry.html).then(r => r.text());
                if (manifest.entry.css) css = await fetch(manifest.entry.css).then(r => r.text());
            }

            if (css) {
                const style = document.createElement('style');
                style.textContent = css;
                shadow.appendChild(style);
            }
            if (html) {
                const content = document.createElement('div');
                content.innerHTML = html;
                shadow.appendChild(content);
            }

            if (window.I18nManager) window.I18nManager.applyShadowI18n(shadow);

            if (jsSource || manifest.entry.js) {
                let moduleUrl = manifest.entry.js;
                if (jsSource) {
                    const blob = new Blob([jsSource], { type: 'application/javascript' });
                    moduleUrl = URL.createObjectURL(blob);
                }

                try {
                    const module = await import(moduleUrl);
                    if (module.default && typeof module.default.init === 'function') {
                        const context = pluginContext.create(manifest, shadow);
                        await module.default.init(shadow, context);
                        activePlugins.set(manifest.id, { manifest, module: module.default, shadow, context });
                    }
                } finally {
                    if (jsSource && moduleUrl.startsWith('blob:')) {
                        setTimeout(() => URL.revokeObjectURL(moduleUrl), 1000);
                    }
                }
            } else {
                activePlugins.set(manifest.id, { manifest, shadow });
            }

            if (window.SidebarManager) window.SidebarManager.addSidebarItem(manifest);
            if (window.TTS_ICONS && manifest.icon) window.TTS_ICONS[manifest.id] = manifest.icon;

        } catch (err) {
            console.error(`[PluginRenderer] Hydration failed for ${manifest.id}:`, err);
        }
    }
};
