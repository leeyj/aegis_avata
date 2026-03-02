/**
 * AEGIS Unit Selection Plugin (v1.6.8 Modularized)
 * Optimized to use Plugin-X Context API.
 */
export default {
    init: function (shadowRoot, context) {
        const select = shadowRoot.getElementById('model-select');
        if (!select) return;

        const refreshList = async () => {
            try {
                // [FIX] Using standardized endpoint (/api/plugins/unit-select/list)
                const response = await fetch('/api/plugins/unit-select/list');
                const models = await response.json();

                select.innerHTML = '';
                const activeModel = context.getActiveModel();

                models.forEach(model => {
                    const opt = document.createElement('option');
                    opt.value = model;
                    opt.innerText = model.replace('_vts', '').toUpperCase() + " UNIT";
                    if (model === activeModel) opt.selected = true;
                    select.appendChild(opt);
                });
            } catch (e) {
                context.log("Failed to refresh unit list: " + e.message);
            }
        };

        select.onchange = (e) => {
            // [FIX] Use context.changeModel instead of global window.loadModel
            context.changeModel(e.target.value);
        };

        refreshList();
    }
};
