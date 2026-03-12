/**
 * AEGIS IframeEngine (v4.2)
 * Handles sandboxed Iframe creation, asset resolution, and bootstrapping.
 */
import messageBroker from '../message_broker.js';

export class IframeEngine {
    static async render(manifest, wrapper, bundle, activePlugins) {
        const baseUrl = window.AEGIS_BASE_URL || '';
        const origin = window.location.origin;
        const bundled = bundle ? bundle[manifest.id] : null;

        const resolve = (path) => {
            if (!path || path.startsWith('http') || path.startsWith('blob:')) return path;
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            if (!path.startsWith('/')) {
                // [v4.2.1] Corrected path to use /assets/ prefix for static files
                return `${baseUrl}/api/plugins/assets/${manifest.id}/${path}`;
            }
            return `${baseUrl}${cleanPath}`;
        };

        const htmlPath = manifest.entry.html ? resolve(manifest.entry.html) : '';
        const pluginBaseUrl = htmlPath ? (origin + htmlPath.substring(0, htmlPath.lastIndexOf('/') + 1)) : `${origin}${baseUrl}/api/plugins/${manifest.id}/`;

        try {
            const html = (bundled ? bundled.html : (htmlPath ? await fetch(htmlPath).then(r => r.text()) : '')) || '';
            let css = (bundled ? bundled.css : (manifest.entry.css ? await fetch(resolve(manifest.entry.css)).then(r => r.text()) : '')) || '';
            if (css && typeof css === 'string' && (css.trim().startsWith('<!DOCTYPE') || css.trim().startsWith('<html'))) css = ''; 
            
            const js_code = (bundled ? bundled.js : (manifest.entry.js ? await fetch(resolve(manifest.entry.js)).then(r => r.text()) : '')) || '';

            const docContent = this._generateTemplate({
                manifest,
                html,
                css,
                js_code,
                origin,
                baseUrl,
                pluginBaseUrl,
                bundled
            });

            // [v4.2] New Window/Tab Target Support
            if (manifest.launch_target === 'window' || manifest.launch_target === 'tab') {
                console.log(`[IframeEngine] Launching ${manifest.id} as ${manifest.launch_target}...`);
                const isTab = manifest.launch_target === 'tab';
                const features = isTab ? '' : (manifest.window_features || 'width=1000,height=700');
                const newWin = window.open('about:blank', `aegis-plugin-${manifest.id}`, features);
                
                if (newWin) {
                    newWin.document.write(docContent);
                    newWin.document.close();
                    messageBroker.registerWidget(manifest.id, newWin);
                    activePlugins.set(manifest.id, { manifest, window: newWin });
                    messageBroker.broadcast('PLUGIN_LOADED', manifest);
                    return newWin;
                } else {
                    throw new Error("Popup blocked or failed to open window.");
                }
            }

            const iframe = this._createIframeElement(manifest);
            wrapper.appendChild(iframe);

            // [v4.2.6] IMPORTANT: Register in broker IMMEDIATELY after attachment, 
            // DO NOT wait for onload, otherwise init() calls from within iframe will deadlock.
            // Pass the `iframe` element itself so broker accesses the latest `contentWindow`
            messageBroker.registerWidget(manifest.id, iframe);
            activePlugins.set(manifest.id, { manifest, iframe });

            // [v4.4.0] Reverted to srcdoc to ensure valid Referrer (Fixes YouTube Error 153)
            // srcdoc inherits the parent's origin and sends a proper Referrer header.
            iframe.srcdoc = docContent;
            
            return new Promise((resolve) => {
                iframe.onload = () => {
                    messageBroker.broadcast('PLUGIN_LOADED', manifest);
                    resolve(iframe);
                };
            });
        } catch (e) {
            console.error(`[IframeEngine] Failed to render plugin ${manifest.id}:`, e);
            throw e;
        }
    }

    static _createIframeElement(manifest) {
        const iframe = document.createElement('iframe');
        iframe.id = `iframe-${manifest.id}`;
        iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups allow-presentation allow-modals allow-top-navigation allow-top-navigation-by-user-activation');
        iframe.setAttribute('allow', 'autoplay; clipboard-write; encrypted-media; picture-in-picture');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        iframe.setAttribute('allowTransparency', 'true');
        iframe.style.border = 'none';
        iframe.style.background = 'transparent';
        iframe.style.backgroundColor = 'transparent';
        iframe.tabIndex = 0;

        const isPassthrough = manifest.layout?.layer === 'back';
        iframe.style.width = '100%';
        iframe.style.flex = '1';
        iframe.style.pointerEvents = isPassthrough ? 'none' : 'auto';
        iframe.style.display = 'block';

        return iframe;
    }

    static _generateTemplate({ manifest, html, css, js_code, origin, baseUrl, pluginBaseUrl, bundled }) {
        const safeJs = js_code ? JSON.stringify(js_code).replace(/<\/script>/gi, '<\\/script>') : 'null';
        const safeI18n = JSON.stringify(window.i18nData || {}).replace(/<\/script>/gi, '<\\/script>');
        const safeManifest = JSON.stringify(manifest).replace(/<\/script>/gi, '<\\/script>');
        const safeOrigin = JSON.stringify(origin);

        // [v4.3.1] Pre-evaluate conditions to avoid scope issues in template literal evaluation
        const isNotBundled = !bundled;
        const hasEntryJs = !!manifest.entry?.js;
        const entryUrlPrefix = `${origin}${baseUrl}/api/plugins/assets/${manifest.id}/`;
        const entryJsName = manifest.entry?.js || '';

        // [v4.3.3] Pre-calculate entry URL to avoid complex logic inside template literal
        const finalEntryUrl = entryJsName.startsWith('/') ? `${origin}${entryJsName}` : `${entryUrlPrefix}${entryJsName}`;

        return `
            <!DOCTYPE html>
            <html style="${manifest.launch_target !== 'window' ? 'background: transparent !important;' : ''}">
            <head>
                <meta name="referrer" content="strict-origin-when-cross-origin">
                <base href="${pluginBaseUrl}">
                <link rel="stylesheet" href="${origin}${baseUrl}/static/css/base.css">
                <link rel="stylesheet" href="${origin}${baseUrl}/static/css/style.css">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
                <script src="${origin}${baseUrl}/static/js/marked.min.js"></script>
                <script>
                    window.i18nData = ${safeI18n};
                    window.AEGIS_TEST_MODE = ${window.AEGIS_TEST_MODE || false};
                </script>
                <style>
                    html, body { 
                        ${manifest.launch_target !== 'window' ? 'background: transparent !important; background-color: transparent !important;' : ''}
                        margin: 0; padding: 0; 
                        overflow: auto; 
                        width: 100%; height: 100%;
                        cursor: default !important;
                    }
                    ${css}
                </style>
            </head>
            <body>
                ${html}
                <script type="module">
                    console.log("[PluginBootstrap] Starting boot process for ${manifest.id}...");
                    try {
                        window.ORIGIN = ${safeOrigin};
                        const contextUrl = '${origin}${baseUrl}/static/js/loader/plugin_context.js?v=' + Date.now();
                        
                        const { pluginContext } = await import(contextUrl);
                        const manifest = ${safeManifest};
                        const context = pluginContext.create(manifest);
                        window.context = context; 

                        const js_code = ${safeJs};
                        if (js_code) {
                            console.log("[PluginBootstrap] Loading plugin entry script...");
                            let module;
                            if ((${isNotBundled} || manifest.module === true) && ${hasEntryJs}) {
                                // [v4.3] Use direct URL for non-bundled scripts to support relative imports
                                const entryUrl = '${finalEntryUrl}?v=' + Date.now();
                                module = await import(entryUrl);
                            } else {
                                const blob = new Blob([js_code], { type: 'application/javascript' });
                                const blobUrl = URL.createObjectURL(blob);
                                module = await import(blobUrl);
                            }
                            
                            if (context.applyI18n) {
                                context.applyI18n(document);
                            }
                            
                            if (module.default?.init) {
                                await module.default.init(document, context);
                                console.log("[PluginBootstrap] module.init() completed.");
                            }
                        }
                    } catch (e) {
                        console.error('[PluginBootstrap] Init Error:', e);
                    }
                </script>
            </body>
            </html>
        `;
    }
}
