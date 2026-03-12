/**
 * AEGIS HybridRenderer (v4.2 Modular)
 * Orchestrates plugin rendering by delegating to WrapperFactory and IframeEngine.
 */
import { WrapperFactory } from './renderer/wrapper_factory.js';
import { IframeEngine } from './renderer/iframe_engine.js';

export class HybridRenderer {
    constructor(activePlugins) {
        this.activePlugins = activePlugins;
    }

    /**
     * Entry point for rendering a plugin.
     * Delegates UI structure to WrapperFactory and sandboxed content to IframeEngine.
     */
    async render(manifest, bundle = null) {
        // [v4.2] New Window Target Support - Skip DOM Wrapper
        if (manifest.launch_target === 'window') {
            return await IframeEngine.render(manifest, null, bundle, this.activePlugins);
        }

        // 1. Create the outer UI container (glass-panel, handle, etc.)
        const wrapper = WrapperFactory.create(manifest);
        if (!wrapper) return;

        // 2. Render the actual sandboxed content within an Iframe
        return await IframeEngine.render(manifest, wrapper, bundle, this.activePlugins);
    }
}
