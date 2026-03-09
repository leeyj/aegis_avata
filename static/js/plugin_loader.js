/**
 * AEGIS Plugin-X: Core Orchestrator
 * Main entry point for dynamic widget injection and capability management.
 */
import { axcCache } from './loader/axc_cache.js';
import { serviceBridge } from './loader/service_bridge.js';
import { pluginRenderer } from './loader/plugin_renderer.js';

// Initialize early boot services
serviceBridge.init();

export const PluginLoader = {
    activePlugins: new Map(),
    bundle: null,

    init: async function () {
        const bootStartTime = performance.now();
        console.log("%c[Plugin-X] Modular Orchestrator Boot Sequence Started...", "color: #00f2ff; font-weight: bold;");

        try {
            // 1. Network Sync (Version Check)
            const networkStartTime = performance.now();
            const versionRes = await fetch(`/api/plugins/version?t=${Date.now()}`);
            const { version: serverVersion } = await versionRes.json();
            const networkDuration = performance.now() - networkStartTime;

            // 2. Asset Retrieval (AXC Cache vs Server)
            const assetStartTime = performance.now();
            let pack = null;
            let cacheHit = false;

            try {
                const localData = await axcCache.get('init_pack');
                if (localData && localData.version === serverVersion) {
                    pack = localData.content;
                    cacheHit = true;
                }
            } catch (e) {
                console.warn("[Plugin-X] Cache access error:", e);
            }

            if (!pack) {
                const res = await fetch(`/api/plugins/init_pack?t=${Date.now()}`);
                pack = await res.json();
                await axcCache.set('init_pack', { version: serverVersion, content: pack });
            }
            const assetDuration = performance.now() - assetStartTime;

            console.log(`%c[AXC Profile] Network: ${networkDuration.toFixed(1)}ms | AssetPrep: ${assetDuration.toFixed(1)}ms (Cache: ${cacheHit ? 'HIT' : 'MISS'})`, "color: #ff9f43;");

            const plugins = pack.plugins || [];
            this.bundle = pack.bundle || {};

            // 3. Logic Activation (Hydration)
            const logicStartTime = performance.now();
            const hydrations = [];

            // Parallel Hydration Pattern (v2.4.6)
            for (const manifest of plugins) {
                const wrapper = pluginRenderer.createWrapper(manifest);
                if (wrapper) {
                    hydrations.push(pluginRenderer.hydrate(manifest, wrapper, this.bundle, this.activePlugins));
                }
            }

            await Promise.all(hydrations);

            const logicDuration = performance.now() - logicStartTime;
            const totalDuration = performance.now() - bootStartTime;

            console.log(
                `%c[Plugin-X] Boot Finished %c Delivery: ${(networkDuration + assetDuration).toFixed(1)}ms | Execution: ${logicDuration.toFixed(1)}ms | Total: ${totalDuration.toFixed(1)}ms`,
                `background: ${cacheHit ? "#32ff7e" : "#ffb8b8"}; color: #000; font-weight: bold; padding: 2px 5px;`,
                "color: #fff;"
            );

            if (window.logger) {
                window.logger.info(`[Performance] Boot:${totalDuration.toFixed(1)}ms (Net:${networkDuration.toFixed(1)}, Asset:${assetDuration.toFixed(1)}, Exec:${logicDuration.toFixed(1)})`);
            }
        } catch (e) {
            console.error("[Plugin-X] Initialization failed:", e);
        }
    }
};

// Global Exposure for index.html compatibility
window.PluginLoader = PluginLoader;
