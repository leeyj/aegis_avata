/**
 * AEGIS Scheduler - Routine Editor Module
 */
window.RoutineEditor = {
    open(id = null, config = null) {
        const modal = document.getElementById('routine-editor-modal');
        const title = document.getElementById('editor-title');
        if (!modal) return;
        modal.style.display = 'flex';

        this._resetFields();
        this._renderDaysSelector();

        if (id && config) {
            title.innerText = "EDIT ROUTINE";
            this._fillFields(id, config);
        } else {
            title.innerText = "ADD NEW ROUTINE";
        }
        this.toggleActionFields();
    },

    close() {
        const modal = document.getElementById('routine-editor-modal');
        if (modal) modal.style.display = 'none';
    },

    _resetFields() {
        document.getElementById('edit-routine-id').value = '';
        document.getElementById('routine-name').value = '';
        document.getElementById('routine-time').value = '09:00';
        document.getElementById('routine-action').value = 'tactical_briefing';
        document.getElementById('routine-target').value = '';
        document.getElementById('routine-volume').value = '50';
        document.getElementById('routine-text').value = '';
    },

    _renderDaysSelector() {
        const container = document.getElementById('routine-days-container');
        if (!container) return;
        container.innerHTML = '';
        [1, 2, 3, 4, 5, 6, 0].forEach(d => {
            const labelStr = _t(`scheduler.days.${d}`, d);
            const isWeekend = (d === 0 || d === 6);
            const label = document.createElement('label');
            if (isWeekend) label.className = 'weekend';
            label.innerHTML = `<input type="checkbox" value="${d}"> ${labelStr}`;
            container.appendChild(label);
        });

        const checkboxes = document.querySelectorAll('#routine-days-container input');
        checkboxes.forEach(cb => cb.checked = true); // Default all days
    },

    _fillFields(id, config) {
        const r = config.routines.find(item => item.id === id);
        if (!r) return;
        document.getElementById('edit-routine-id').value = id;
        document.getElementById('routine-name').value = r.name || '';
        document.getElementById('routine-time').value = r.time || '';
        document.getElementById('routine-action').value = r.action || 'tactical_briefing';
        document.getElementById('routine-target').value = r.target || '';
        document.getElementById('routine-volume').value = r.volume || '50';
        document.getElementById('routine-text').value = r.text || '';

        const checkboxes = document.querySelectorAll('#routine-days-container input');
        checkboxes.forEach(cb => {
            cb.checked = r.days.includes(parseInt(cb.value));
        });
    },

    toggleActionFields() {
        const action = document.getElementById('routine-action').value;
        const targetField = document.getElementById('field-target');
        const targetLabel = document.getElementById('label-target');
        const volField = document.getElementById('field-volume');
        const textField = document.getElementById('field-text');

        if (!targetField) return;

        targetField.style.display = 'none';
        volField.style.display = 'none';
        textField.style.display = 'none';

        if (['widget_briefing', 'yt_play', 'wallpaper_set'].includes(action)) {
            targetField.style.display = 'block';
            if (action === 'widget_briefing') targetLabel.innerText = "Widget ID (e.g. news, stock)";
            if (action === 'yt_play') targetLabel.innerText = "Playlist ID (Optional)";
            if (action === 'wallpaper_set') targetLabel.innerText = "Wallpaper URL / Path";
        }
        if (action === 'yt_volume') volField.style.display = 'block';
        if (action === 'speak') textField.style.display = 'block';

        // Update Action Description
        const descEl = document.getElementById('action-desc');
        if (descEl) {
            const desc = _t(`scheduler.action_descriptions.${action}`);
            descEl.innerText = desc && desc !== `scheduler.action_descriptions.${action}` ? desc : "";
        }
    },

    getRoutineData() {
        const id = document.getElementById('edit-routine-id').value;
        const selectedDays = [];
        document.querySelectorAll('#routine-days-container input:checked').forEach(cb => {
            selectedDays.push(parseInt(cb.value));
        });

        const data = {
            id: id || `routine_${Date.now()}`,
            name: document.getElementById('routine-name').value,
            time: document.getElementById('routine-time').value,
            action: document.getElementById('routine-action').value,
            enabled: true,
            days: selectedDays
        };

        if (document.getElementById('field-target').style.display !== 'none') data.target = document.getElementById('routine-target').value;
        if (document.getElementById('field-volume').style.display !== 'none') data.volume = parseInt(document.getElementById('routine-volume').value);
        if (document.getElementById('field-text').style.display !== 'none') data.text = document.getElementById('routine-text').value;

        return data;
    }
};
