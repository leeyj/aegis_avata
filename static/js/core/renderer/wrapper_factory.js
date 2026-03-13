/**
 * AEGIS WrapperFactory (v4.2)
 * Handles creation and orchestration of the outer UI panel for widgets.
 */
export class WrapperFactory {
    static create(manifest) {
        const wrapper = document.createElement('div');
        wrapper.id = manifest.id;

        const layout = manifest.layout || {};
        const isFixed = !!layout.fixed;
        const isFullScreen = isFixed && 
            (!layout.width || layout.width === '100vw' || layout.width === '100%') && 
            (!layout.height || layout.height === '100vh' || layout.height === '100%');
        const isQuakeStyle = isFixed && (layout.width === '100%' || layout.width === '100vw');

        // [v4.0] Styling based on layout type
        wrapper.className = (isFullScreen || isQuakeStyle) ? 
            'fixed-plugin-wrapper' : 
            'glass-panel-v4 widget-panel fixed-plugin-wrapper';
            
        // [v4.2.6] Support for frameless overlay widgets (hover to show UI)
        if (layout.frameless) {
            wrapper.classList.add('frameless-hover-only');
        }
        if (layout.default_size) wrapper.classList.add(layout.default_size);
        if (layout.zIndex) wrapper.style.zIndex = layout.zIndex;

        if (isFixed) {
            this._applyFixedStyles(wrapper, layout, isFullScreen);
            // [v4.0] If it's a window-like fixed widget, it needs dragging initialization
            if (!isFullScreen && !isQuakeStyle && window.initSinglePanelDraggingV4) {
                window.initSinglePanelDraggingV4(wrapper);
            }
        } else {
            this._applyAbsoluteStyles(wrapper, manifest.id, layout);
            // [v4.0] Drag & Resize Initialization for floating widgets
            if (window.initSinglePanelDraggingV4) {
                window.initSinglePanelDraggingV4(wrapper);
            }
        }

        // [v4.0] Initial Visibility Guard (Must be applied after styles to avoid display property override)
        if (window.panelVisibility && window.panelVisibility[manifest.id] === false) {
            wrapper.style.display = 'none';
        } else if (manifest.hidden) {
            wrapper.style.display = 'none';
        }

        if (window.uiLocked) wrapper.classList.add('locked');

        // [v4.0] Layering Strategy
        this._attachToLayer(wrapper, layout.layer);

        // [v4.0] Add Structural Components (Handle/Resizer)
        if (!isFullScreen && !isQuakeStyle) {
            this._addDecorations(wrapper, manifest);
        }

        return wrapper;
    }

    static _applyFixedStyles(wrapper, layout, isFullScreen) {
        Object.assign(wrapper.style, {
            position: 'fixed',
            top: layout.top || (layout.bottom ? 'auto' : '0'),
            left: layout.left || (layout.right ? 'auto' : '0'),
            bottom: layout.bottom || 'auto',
            right: layout.right || 'auto',
            width: layout.width || (isFullScreen ? '100vw' : 'auto'),
            height: layout.height || (isFullScreen ? '100vh' : 'auto'),
            margin: '0', padding: '0',
            pointerEvents: 'none', // Wrapper itself is passthrough
            zIndex: layout.zIndex || 'var(--z-widget)',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible'
        });
    }

    static _applyAbsoluteStyles(wrapper, id, layout) {
        wrapper.style.position = 'absolute';
        wrapper.style.zIndex = layout.zIndex || "var(--z-widget)";

        if (window.uiPositions && window.uiPositions[id]) {
            const pos = window.uiPositions[id];
            if (pos.leftRatio !== undefined) wrapper.style.left = (pos.leftRatio * window.innerWidth) + "px";
            if (pos.topRatio !== undefined) wrapper.style.top = (pos.topRatio * window.innerHeight) + "px";
            if (pos.left !== undefined) wrapper.style.left = pos.left;
            if (pos.top !== undefined) wrapper.style.top = pos.top;
            if (pos.width) wrapper.style.width = pos.width;
            if (pos.height) wrapper.style.height = pos.height;
        } else {
            const count = document.querySelectorAll('.widget-panel').length;
            wrapper.style.left = (120 + (count * 30)) + "px";
            wrapper.style.top = (120 + (count * 30)) + "px";
            if (layout.width) wrapper.style.width = layout.width;
            if (layout.height) wrapper.style.height = layout.height;
        }
    }

    static _attachToLayer(wrapper, layerName) {
        let targetContainer = document.getElementById('ui-layer');
        if (layerName === 'back') {
            targetContainer = document.getElementById('back-layer') || targetContainer;
        }

        if (targetContainer) {
            targetContainer.appendChild(wrapper);
        } else {
            document.body.appendChild(wrapper);
        }
    }

    static _addDecorations(wrapper, manifest) {
        // Drag Handle
        const handle = document.createElement('div');
        handle.className = 'widget-drag-handle-v4';
        handle.innerHTML = `<span class="handle-title">${manifest.name || manifest.id}</span><div class="handle-dots">•••</div>`;
        wrapper.prepend(handle);
        
        wrapper.style.padding = '0';
        wrapper.classList.add('frameless-widget');

        // Resizer Handle
        const resizer = document.createElement('div');
        resizer.className = 'widget-resizer-v4';
        wrapper.appendChild(resizer);
    }
}
