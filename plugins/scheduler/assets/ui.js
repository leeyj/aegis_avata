export default class SchedulerUI {
    constructor(root, context, manager) {
        this.root = root;
        this.context = context;
        this.manager = manager;
    }

    renderGatekeeper(gatekeeper) {
        const container = this.root.getElementById('gatekeeper-list');
        if (!container || !gatekeeper) return;

        container.innerHTML = '';
        Object.entries(gatekeeper).forEach(([category, config]) => {
            const type = config.allow ? 'Allow' : (config.deny ? 'Deny' : 'Always');
            const range = config.allow ? `${config.allow.start} - ${config.allow.end}` : (config.deny ? `${config.deny.start} - ${config.deny.end}` : '24h');

            const item = document.createElement('div');
            item.className = 'gk-item';
            item.innerHTML = `
                <div class="gk-header">
                    <span class="gk-name">${category}</span>
                    <span class="gk-range">${range} (${type})</span>
                    <button class="gk-edit-btn" data-action="openGKEditor" data-id="${category}" title="EDIT">✏️</button>
                </div>
                <div class="switch-inline">
                    <label class="switch">
                        <input type="checkbox" data-action="toggleGK" data-id="${category}" ${config.enabled ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                    <span style="font-size: 0.8rem; opacity: 0.7;">${config.enabled ? 'ENABLED' : 'DISABLED'}</span>
                </div>
            `;
            container.appendChild(item);
        });
    }

    renderRoutines(routines) {
        const container = this.root.getElementById('routine-list');
        if (!container || !routines) return;

        container.innerHTML = '';
        let systemState = {};
        try { systemState = JSON.parse(localStorage.getItem('systemState') || '{}'); } catch(e){}
        const lang = systemState.currentLang || 'ko';

        routines.forEach(routine => {
            const card = document.createElement('div');
            card.className = `routine-card ${routine.enabled ? '' : 'disabled'}`;

            const daysLabel = this._getDaysLabel(routine.days || [], lang);
            const details = this._getRoutineDetails(routine);
            const detailHtml = details.length > 0 ? `<div class="routine-line details">${details.join(' | ')}</div>` : '';
            const displayTime = routine.time === 'hourly' ? this.context._t('scheduler.hourly') || '매 시간' : routine.time;

            card.innerHTML = `
                <div class="routine-info">
                    <h4>${routine.name}</h4>
                    <div class="routine-line">⚡ <b>Action:</b> ${routine.action}</div>
                    <div class="routine-line">⏰ <b>Time:</b> ${displayTime} (${daysLabel})</div>
                    ${detailHtml}
                </div>
                <div class="routine-actions">
                    <button class="action-btn" data-action="toggleRoutine" data-id="${routine.id}">${routine.enabled ? 'DISABLE' : 'ENABLE'}</button>
                    <button class="action-btn edit" data-action="openRoutineEditor" data-id="${routine.id}">EDIT</button>
                    <button class="action-btn delete" data-action="deleteRoutine" data-id="${routine.id}">DEL</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    _getDaysLabel(days, lang) {
        if (days.length === 7) return lang === 'ko' ? '매일' : 'Daily';
        if (days.length === 5 && !days.includes(0) && !days.includes(6)) return lang === 'ko' ? '평일' : 'Weekdays';
        return days.map(d => this.context._t(`scheduler.days.${d}`) || d).join(', ');
    }

    _getRoutineDetails(routine) {
        const details = [];
        if (routine.target) details.push(`<b>Target:</b> ${routine.target}`);
        if (routine.volume !== undefined) details.push(`<b>Vol:</b> ${routine.volume}%`);
        if (routine.text) details.push(`<b>Speak:</b> "${routine.text.substring(0, 20)}${routine.text.length > 20 ? '...' : ''}"`);
        return details;
    }
}
