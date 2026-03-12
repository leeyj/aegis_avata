/**
 * AEGIS Unit Selection Plugin (v1.6.8 Modularized)
 * Optimized to use Plugin-X Context API.
 */
export default {
    init: function (root, context) {
        const select = root.getElementById('model-select');
        if (!select) return;

        const refreshList = async () => {
            try {
                // [v4.1.0] Standardized fetching via context
                const response = await context.fetch('list');
                const models = await response.json();

                select.innerHTML = '';
                const activeData = await context.getActiveModel();
                const activeModel = activeData ? activeData.modelId : null;

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
