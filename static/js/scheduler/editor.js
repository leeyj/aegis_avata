/**
 * AEGIS Scheduler - Routine Editor Module (v1.8)
 * 시간 기반 루틴 + 조건 감시 루틴 통합 에디터
 */
window.RoutineEditor = {
    _cachedExports: null,

    async open(id = null, config = null) {
        const modal = document.getElementById('routine-editor-modal');
        const title = document.getElementById('editor-title');
        if (!modal) return;
        modal.style.display = 'flex';

        this._resetFields();
        this._renderDaysSelector();

        // exports 로드 (센서 드롭다운용)
        await this._loadExports();

        if (id && config) {
            title.innerText = "EDIT ROUTINE";
            this._fillFields(id, config);
        } else {
            title.innerText = "ADD NEW ROUTINE";
        }
        this.toggleActionFields();
        this.toggleTriggerType();
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
        const cmdEl = document.getElementById('routine-command');
        if (cmdEl) cmdEl.value = '';
        const urlEl = document.getElementById('routine-url');
        if (urlEl) urlEl.value = '';

        // 조건 감시 필드 초기화
        const triggerType = document.getElementById('routine-trigger-type');
        if (triggerType) triggerType.value = 'time';
        const sensorEl = document.getElementById('routine-sensor');
        if (sensorEl) sensorEl.value = '';
        const operatorEl = document.getElementById('routine-operator');
        if (operatorEl) operatorEl.value = '>=';
        const condValueEl = document.getElementById('routine-cond-value');
        if (condValueEl) condValueEl.value = '';
        const cooldownEl = document.getElementById('routine-cooldown');
        if (cooldownEl) cooldownEl.value = '30';
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

    async _loadExports() {
        const sensorSelect = document.getElementById('routine-sensor');
        if (!sensorSelect) return;

        // 캐싱: 동일 세션에서 재요청 방지
        if (!this._cachedExports) {
            try {
                const res = await fetch('/api/plugins/scheduler/exports');
                this._cachedExports = await res.json();
            } catch (e) {
                console.warn('[Scheduler] Failed to load exports:', e);
                this._cachedExports = { sensors: [], commands: [] };
            }
        }

        // 센서 드롭다운 채우기
        sensorSelect.innerHTML = '<option value="">센서를 선택하세요...</option>';
        const sensors = this._cachedExports.sensors || [];
        sensors.forEach(s => {
            const opt = document.createElement('option');
            // endpoint|field 형식으로 값 저장 (나중에 분리)
            opt.value = JSON.stringify({ endpoint: s.endpoint, field: s.field, type: s.type });
            const icon = s.unit === '°C' ? '🌡️' : s.unit === '%' ? '💧' : '📊';
            opt.textContent = `${icon} ${s.name} (${s.unit}) — ${s.plugin_name}`;
            sensorSelect.appendChild(opt);
        });
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
        const cmdEl = document.getElementById('routine-command');
        if (cmdEl) cmdEl.value = r.command || '';
        const urlEl = document.getElementById('routine-url');
        if (urlEl) urlEl.value = r.url || '';

        // 조건 감시 필드 채우기
        if (r.condition) {
            const triggerType = document.getElementById('routine-trigger-type');
            if (triggerType) triggerType.value = 'condition';

            const sensorSelect = document.getElementById('routine-sensor');
            if (sensorSelect) {
                // endpoint+field 조합으로 매칭
                const targetVal = JSON.stringify({ endpoint: r.condition.source, field: r.condition.field, type: 'number' });
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
            const operatorEl = document.getElementById('routine-operator');
            if (operatorEl) operatorEl.value = r.condition.operator || '>=';
            const condValueEl = document.getElementById('routine-cond-value');
            if (condValueEl) condValueEl.value = r.condition.value ?? '';
            const cooldownEl = document.getElementById('routine-cooldown');
            if (cooldownEl) cooldownEl.value = r.cooldown_min || 30;
        }

        const checkboxes = document.querySelectorAll('#routine-days-container input');
        checkboxes.forEach(cb => {
            cb.checked = r.days.includes(parseInt(cb.value));
        });
    },

    toggleTriggerType() {
        const triggerType = document.getElementById('routine-trigger-type');
        const timeField = document.getElementById('field-time');
        const conditionField = document.getElementById('field-condition');
        if (!triggerType || !timeField || !conditionField) return;

        if (triggerType.value === 'condition') {
            timeField.style.display = 'none';
            conditionField.style.display = 'block';
        } else {
            timeField.style.display = 'block';
            conditionField.style.display = 'none';
        }
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

        // v1.7.1 범용 액션 필드
        const cmdField = document.getElementById('field-command');
        const urlField = document.getElementById('field-url');
        if (cmdField) cmdField.style.display = action === 'terminal_command' ? 'block' : 'none';
        if (urlField) urlField.style.display = action === 'api_call' ? 'block' : 'none';

        // Update Action Description
        const descEl = document.getElementById('action-desc');
        if (descEl) {
            const desc = _t(`scheduler.action_descriptions.${action}`);
            descEl.innerText = desc && desc !== `scheduler.action_descriptions.${action}` ? desc : "";
        }
    },

    getRoutineData() {
        const id = document.getElementById('edit-routine-id').value;
        const triggerType = document.getElementById('routine-trigger-type')?.value || 'time';
        const selectedDays = [];
        document.querySelectorAll('#routine-days-container input:checked').forEach(cb => {
            selectedDays.push(parseInt(cb.value));
        });

        const data = {
            id: id || `routine_${Date.now()}`,
            name: document.getElementById('routine-name').value,
            time: triggerType === 'condition' ? 'every_1m' : document.getElementById('routine-time').value,
            action: document.getElementById('routine-action').value,
            enabled: true,
            days: selectedDays
        };

        // 액션별 추가 필드
        if (document.getElementById('field-target').style.display !== 'none') data.target = document.getElementById('routine-target').value;
        if (document.getElementById('field-volume').style.display !== 'none') data.volume = parseInt(document.getElementById('routine-volume').value);
        if (document.getElementById('field-text').style.display !== 'none') data.text = document.getElementById('routine-text').value;

        const cmdField = document.getElementById('field-command');
        const urlField = document.getElementById('field-url');
        if (cmdField && cmdField.style.display !== 'none') data.command = document.getElementById('routine-command').value;
        if (urlField && urlField.style.display !== 'none') data.url = document.getElementById('routine-url').value;

        // 조건 감시 데이터
        if (triggerType === 'condition') {
            const sensorVal = document.getElementById('routine-sensor')?.value;
            if (sensorVal) {
                try {
                    const sensor = JSON.parse(sensorVal);
                    data.condition = {
                        source: sensor.endpoint,
                        field: sensor.field,
                        type: sensor.type || 'number',
                        operator: document.getElementById('routine-operator')?.value || '>=',
                        value: this._coerceCondValue(sensor.type, document.getElementById('routine-cond-value')?.value)
                    };
                } catch (_) { }
            }
            data.cooldown_min = parseInt(document.getElementById('routine-cooldown')?.value) || 30;
        }

        return data;
    },

    /** 센서 type에 따라 사용자 입력값을 적절한 타입으로 변환 */
    _coerceCondValue(sensorType, rawValue) {
        switch (sensorType) {
            case 'number': return parseFloat(rawValue) || 0;
            case 'boolean': return rawValue === 'true' || rawValue === '1';
            case 'string': return String(rawValue);
            default: return parseFloat(rawValue) || rawValue;
        }
    }
};
