export default class SchedulerEditor {
    constructor(root, context, manager) {
        this.root = root;
        this.context = context;
        this.manager = manager; 
    }

    openGKEditor(category) {
        const modal = this.root.getElementById('gk-editor-modal');
        if (!modal) return;
        
        modal.style.display = 'flex';
        this.root.getElementById('edit-gk-category').value = category;
        this.root.getElementById('gk-editor-title').innerText = `EDIT GATEKEEPER: ${category.toUpperCase()}`;

        const gk = this.manager.currentConfig.gatekeeper[category];
        const isAllow = !!gk.allow;
        const target = isAllow ? gk.allow : (gk.deny || { start: "0000", end: "0000", days: [] });

        this.root.getElementById('gk-logic-type').value = isAllow ? 'allow' : 'deny';
        this.root.getElementById('gk-start-time').value = target.start;
        this.root.getElementById('gk-end-time').value = target.end;

        const container = this.root.getElementById('gk-days-container');
        container.innerHTML = '';
        [1, 2, 3, 4, 5, 6, 0].forEach(d => {
            const labelStr = this.context._t(`scheduler.days.${d}`) || d;
            const isWeekend = (d === 0 || d === 6);
            const label = document.createElement('label');
            if (isWeekend) label.className = 'weekend';
            const checked = target.days.includes(d) ? 'checked' : '';
            label.innerHTML = `<input type="checkbox" value="${d}" ${checked}> ${labelStr}`;
            container.appendChild(label);
        });
    }

    closeGKEditor() {
        const modal = this.root.getElementById('gk-editor-modal');
        if (modal) modal.style.display = 'none';
    }

    applyGKChanges() {
        const category = this.root.getElementById('edit-gk-category').value;
        const type = this.root.getElementById('gk-logic-type').value;
        const start = this.root.getElementById('gk-start-time').value.padStart(4, '0');
        const end = this.root.getElementById('gk-end-time').value.padStart(4, '0');
        
        const selectedDays = [];
        this.root.querySelectorAll('#gk-days-container input:checked').forEach(cb => {
            selectedDays.push(parseInt(cb.value));
        });

        const gk = this.manager.currentConfig.gatekeeper[category];
        const isEnabled = gk.enabled;
        
        delete gk.allow;
        delete gk.deny;
        gk[type] = { start, end, days: selectedDays };
        gk.enabled = isEnabled;

        this.manager.ui.renderGatekeeper(this.manager.currentConfig.gatekeeper);
        this.closeGKEditor();
    }

    async openRoutineEditor(id = null) {
        const modal = this.root.getElementById('routine-editor-modal');
        if (!modal) return;
        modal.style.display = 'flex';

        this._resetRoutineEditorFields();
        this._renderRoutineDaysSelector();
        await this._loadRoutineExports();

        const title = this.root.getElementById('editor-title');
        if (id && this.manager.currentConfig) {
            title.innerText = "EDIT ROUTINE";
            this._fillRoutineFields(id, this.manager.currentConfig);
        } else {
            title.innerText = "ADD NEW ROUTINE";
        }
        this.toggleActionFields();
        this.toggleTriggerType();
    }

    closeRoutineEditor() {
        const modal = this.root.getElementById('routine-editor-modal');
        if (modal) modal.style.display = 'none';
    }

    _resetRoutineEditorFields() {
        const setVal = (id, val) => { const el = this.root.getElementById(id); if(el) el.value = val; };
        setVal('edit-routine-id', '');
        setVal('routine-name', '');
        setVal('routine-time', '09:00');
        setVal('routine-action', 'tactical_briefing');
        setVal('routine-target', '');
        setVal('routine-volume', '50');
        setVal('routine-text', '');
        setVal('routine-command', '');
        setVal('routine-url', '');
        setVal('routine-trigger-type', 'time');
        setVal('routine-sensor', '');
        setVal('routine-operator', '>=');
        setVal('routine-cond-value', '');
        setVal('routine-cooldown', '30');
    }

    _renderRoutineDaysSelector() {
        const container = this.root.getElementById('routine-days-container');
        if (!container) return;
        container.innerHTML = '';
        [1, 2, 3, 4, 5, 6, 0].forEach(d => {
            const labelStr = this.context._t(`scheduler.days.${d}`) || d;
            const isWeekend = (d === 0 || d === 6);
            const label = document.createElement('label');
            if (isWeekend) label.className = 'weekend';
            label.innerHTML = `<input type="checkbox" value="${d}" checked> ${labelStr}`;
            container.appendChild(label);
        });
    }

    async _loadRoutineExports() {
        const sensorSelect = this.root.getElementById('routine-sensor');
        if (!sensorSelect) return;

        const cachedExports = await this.manager.api.getExports();

        sensorSelect.innerHTML = '<option value="">센서를 선택하세요...</option>';
        (cachedExports.sensors || []).forEach(s => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify({ endpoint: s.endpoint, field: s.field, type: s.type });
            const icon = s.unit === '°C' ? '🌡️' : s.unit === '%' ? '💧' : '📊';
            opt.textContent = `${icon} ${s.name} (${s.unit}) — ${s.plugin_name}`;
            sensorSelect.appendChild(opt);
        });

        const actionSelect = this.root.getElementById('routine-action');
        if (actionSelect) {
            actionSelect.querySelectorAll('.dynamic-action').forEach(el => el.remove());
            const actions = cachedExports.actions || [];
            if (actions.length > 0) {
                const separator = document.createElement('option');
                separator.disabled = true;
                separator.textContent = "─── Remote Plugin Actions ───";
                separator.className = 'dynamic-action-separator dynamic-action';
                actionSelect.appendChild(separator);

                actions.forEach(a => {
                    const opt = document.createElement('option');
                    opt.value = `plugin:${a.plugin_id}:${a.id}`;
                    opt.textContent = `🔌 ${a.name} (${a.plugin_name})`;
                    opt.dataset.description = a.description;
                    opt.className = 'dynamic-action';
                    actionSelect.appendChild(opt);
                });
            }
        }
    }

    _fillRoutineFields(id, config) {
        const r = config.routines.find(item => item.id === id);
        if (!r) return;
        const setVal = (sid, val) => { const el = this.root.getElementById(sid); if(el) el.value = val; };
        
        setVal('edit-routine-id', id);
        setVal('routine-name', r.name || '');
        setVal('routine-time', r.time || '');
        setVal('routine-action', r.action || 'tactical_briefing');
        setVal('routine-target', r.target || '');
        setVal('routine-volume', r.volume || '50');
        setVal('routine-text', r.text || '');
        setVal('routine-command', r.command || '');
        setVal('routine-url', r.url || '');

        if (r.condition) {
            setVal('routine-trigger-type', 'condition');
            const sensorSelect = this.root.getElementById('routine-sensor');
            if (sensorSelect) {
                for (const opt of sensorSelect.options) {
                    try {
                        const parsed = JSON.parse(opt.value);
                        if (parsed.endpoint === r.condition.source && parsed.field === r.condition.field) {
                            sensorSelect.value = opt.value;
                            break;
                        }
                    } catch (_) { }
                }
            }
            setVal('routine-operator', r.condition.operator || '>=');
            setVal('routine-cond-value', r.condition.value ?? '');
            setVal('routine-cooldown', r.cooldown_min || 30);
        }

        this.root.querySelectorAll('#routine-days-container input').forEach(cb => {
            cb.checked = r.days.includes(parseInt(cb.value));
        });
    }

    toggleTriggerType() {
        const triggerType = this.root.getElementById('routine-trigger-type');
        const timeField = this.root.getElementById('field-time');
        const conditionField = this.root.getElementById('field-condition');
        if (!triggerType || !timeField || !conditionField) return;

        if (triggerType.value === 'condition') {
            timeField.style.display = 'none';
            conditionField.style.display = 'block';
        } else {
            timeField.style.display = 'block';
            conditionField.style.display = 'none';
        }
    }

    toggleActionFields() {
        const action = this.root.getElementById('routine-action').value;
        const targetField = this.root.getElementById('field-target');
        const targetLabel = this.root.getElementById('label-target');
        const volField = this.root.getElementById('field-volume');
        const textField = this.root.getElementById('field-text');
        const cmdField = this.root.getElementById('field-command');
        const urlField = this.root.getElementById('field-url');

        if (!targetField) return;

        [targetField, volField, textField, cmdField, urlField].forEach(el => { if(el) el.style.display = 'none'; });

        if (['widget_briefing', 'yt_play', 'wallpaper_set'].includes(action)) {
            targetField.style.display = 'block';
            if (action === 'widget_briefing') targetLabel.innerText = "Widget ID (e.g. news, stock)";
            if (action === 'yt_play') targetLabel.innerText = "Playlist ID (Optional)";
            if (action === 'wallpaper_set') targetLabel.innerText = "Wallpaper URL / Path";
        }
        if (action === 'yt_volume') volField.style.display = 'block';
        if (action === 'speak') textField.style.display = 'block';
        if (cmdField && action === 'terminal_command') cmdField.style.display = 'block';
        if (urlField && action === 'api_call') urlField.style.display = 'block';

        const descEl = this.root.getElementById('action-desc');
        if (descEl) {
            if (action.startsWith('plugin:')) {
                const opt = this.root.querySelector(`#routine-action option[value="${action}"]`);
                descEl.innerText = opt ? opt.dataset.description : "";
            } else {
                const desc = this.context._t(`scheduler.action_descriptions.${action}`);
                descEl.innerText = desc && desc !== `scheduler.action_descriptions.${action}` ? desc : "";
            }
        }
    }

    async applyRoutineChanges() {
        const triggerType = this.root.getElementById('routine-trigger-type')?.value || 'time';
        const name = this.root.getElementById('routine-name').value;
        const time = this.root.getElementById('routine-time').value;

        if (!name) { alert("Please fill in Name."); return; }
        if (triggerType === 'time' && !time) { alert("Please fill in Time."); return; }

        const selectedDays = [];
        this.root.querySelectorAll('#routine-days-container input:checked').forEach(cb => {
            selectedDays.push(parseInt(cb.value));
        });
        if (selectedDays.length === 0) { alert("Please select at least one day."); return; }

        const data = {
            id: this.root.getElementById('edit-routine-id').value || `routine_${Date.now()}`,
            name: name,
            time: triggerType === 'condition' ? 'every_1m' : time,
            action: this.root.getElementById('routine-action').value,
            enabled: true,
            days: selectedDays
        };

        if (this.root.getElementById('field-target').style.display !== 'none') data.target = this.root.getElementById('routine-target').value;
        if (this.root.getElementById('field-volume').style.display !== 'none') data.volume = parseInt(this.root.getElementById('routine-volume').value);
        if (this.root.getElementById('field-text').style.display !== 'none') data.text = this.root.getElementById('routine-text').value;

        const cmdField = this.root.getElementById('field-command');
        const urlField = this.root.getElementById('field-url');
        if (cmdField && cmdField.style.display !== 'none') data.command = this.root.getElementById('routine-command').value;
        if (urlField && urlField.style.display !== 'none') data.url = this.root.getElementById('routine-url').value;

        if (triggerType === 'condition') {
            const sensorVal = this.root.getElementById('routine-sensor')?.value;
            if (!sensorVal) { alert("감시 대상 센서를 선택해주세요."); return; }
            try {
                const sensor = JSON.parse(sensorVal);
                data.condition = {
                    source: sensor.endpoint,
                    field: sensor.field,
                    type: sensor.type || 'number',
                    operator: this.root.getElementById('routine-operator')?.value || '>=',
                    value: this._coerceCondValue(sensor.type, this.root.getElementById('routine-cond-value')?.value)
                };
            } catch (_) { }
            data.cooldown_min = parseInt(this.root.getElementById('routine-cooldown')?.value) || 30;
        }

        if (data.action.startsWith('plugin:')) {
            const cachedExports = await this.manager.api.getExports();
            const actions = cachedExports.actions || [];
            const actionId = data.action.split(':').slice(2).join(':');
            const pluginId = data.action.split(':')[1];
            const found = actions.find(a => a.plugin_id === pluginId && a.id === actionId);
            if (found) {
                data.plugin_payload = {
                    type: found.type,
                    payload: found.payload,
                    command: found.payload?.command,
                    url: found.payload?.url,
                    method: found.payload?.method || 'GET'
                };
            }
        }

        const id = this.root.getElementById('edit-routine-id').value;
        if (id) {
            const idx = this.manager.currentConfig.routines.findIndex(r => r.id === id);
            if (idx !== -1) this.manager.currentConfig.routines[idx] = data;
        } else {
            this.manager.currentConfig.routines.push(data);
        }

        this.manager.ui.renderRoutines(this.manager.currentConfig.routines);
        this.closeRoutineEditor();
    }

    _coerceCondValue(sensorType, rawValue) {
        switch (sensorType) {
            case 'number': return parseFloat(rawValue) || 0;
            case 'boolean': return String(rawValue).toLowerCase() === 'true' || rawValue === '1';
            case 'string': return String(rawValue);
            default: return parseFloat(rawValue) || rawValue;
        }
    }
}
