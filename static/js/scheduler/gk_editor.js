/**
 * AEGIS Gatekeeper Editor - Specialized configuration for active hours
 */
window.GKEditor = {
    open(category, config) {
        console.log(`[GKEditor] Opening editor for: ${category}`, config);
        const modal = document.getElementById('gk-editor-modal');
        if (!modal) {
            console.error("[GKEditor] Modal element not found: #gk-editor-modal");
            return;
        }
        if (!config || !config.gatekeeper[category]) {
            console.error("[GKEditor] Invalid config or category:", category, config);
            return;
        }

        modal.style.display = 'flex';
        document.getElementById('edit-gk-category').value = category;
        document.getElementById('gk-editor-title').innerText = `EDIT GATEKEEPER: ${category.toUpperCase()}`;

        const gk = config.gatekeeper[category];
        const isAllow = !!gk.allow;
        const target = isAllow ? gk.allow : (gk.deny || { start: "0000", end: "0000", days: [] });

        console.log(`[GKEditor] Filling fields. Type: ${isAllow ? 'allow' : 'deny'}`, target);
        document.getElementById('gk-logic-type').value = isAllow ? 'allow' : 'deny';
        document.getElementById('gk-start-time').value = target.start;
        document.getElementById('gk-end-time').value = target.end;

        this._renderDaysSelector(target.days || []);
        console.log("[GKEditor] Editor opened successfully.");
    },

    close() {
        const modal = document.getElementById('gk-editor-modal');
        if (modal) modal.style.display = 'none';
    },

    _renderDaysSelector(selectedDays) {
        const container = document.getElementById('gk-days-container');
        if (!container) return;
        container.innerHTML = '';
        const lang = window.currentLang || 'ko';

        [1, 2, 3, 4, 5, 6, 0].forEach(d => {
            const labelStr = _t(`scheduler.days.${d}`, d);
            const isWeekend = (d === 0 || d === 6);
            const label = document.createElement('label');
            if (isWeekend) label.className = 'weekend';

            const checked = selectedDays.includes(d) ? 'checked' : '';
            label.innerHTML = `<input type="checkbox" value="${d}" ${checked}> ${labelStr}`;
            container.appendChild(label);
        });
    },

    getData() {
        const category = document.getElementById('edit-gk-category').value;
        const type = document.getElementById('gk-logic-type').value;
        const start = document.getElementById('gk-start-time').value;
        const end = document.getElementById('gk-end-time').value;

        const selectedDays = [];
        document.querySelectorAll('#gk-days-container input:checked').forEach(cb => {
            selectedDays.push(parseInt(cb.value));
        });

        return {
            category,
            type,
            config: {
                start: start.padStart(4, '0'),
                end: end.padStart(4, '0'),
                days: selectedDays
            }
        };
    }
};
