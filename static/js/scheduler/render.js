/**
 * AEGIS Scheduler - UI Rendering Logic
 */
window.SchedulerUI = {
    renderRoutines(routines) {
        const container = document.getElementById('routine-list');
        console.log("[SchedulerUI] Rendering Routines. Container:", container, "Count:", routines?.length);
        if (!container || !routines) return;

        container.innerHTML = '';
        routines.forEach(routine => {
            const card = SchedulerUI._createRoutineCard(routine);
            container.appendChild(card);
        });
        console.log("[SchedulerUI] Rendering complete.");
    },

    _createRoutineCard(routine) {
        const card = document.createElement('div');
        card.className = `routine-card ${routine.enabled ? '' : 'disabled'}`;

        const lang = window.currentLang || 'ko';
        const daysLabel = SchedulerUI._getDaysLabel(routine.days || [], lang);
        const details = SchedulerUI._getRoutineDetails(routine);
        const detailHtml = details.length > 0 ? `<div class="routine-line details">${details.join(' | ')}</div>` : '';
        const displayTime = routine.time === 'hourly' ? _t('scheduler.hourly') : routine.time;

        card.innerHTML = `
            <div class="routine-info">
                <h4>${routine.name}</h4>
                <div class="routine-line">⚡ <b>Action:</b> ${routine.action}</div>
                <div class="routine-line">⏰ <b>Time:</b> ${displayTime} (${daysLabel})</div>
                ${detailHtml}
            </div>
            <div class="routine-actions">
                <button class="action-btn" onclick="toggleRoutine('${routine.id}')">${routine.enabled ? 'DISABLE' : 'ENABLE'}</button>
                <button class="action-btn edit" onclick="openRoutineEditor('${routine.id}')">EDIT</button>
                <button class="action-btn delete" onclick="deleteRoutine('${routine.id}')">DEL</button>
            </div>
        `;
        return card;
    },

    _getDaysLabel(days, lang) {
        if (days.length === 7) return lang === 'ko' ? '매일' : 'Daily';
        if (days.length === 5 && !days.includes(0) && !days.includes(6)) return lang === 'ko' ? '평일' : 'Weekdays';
        return days.map(d => _t(`scheduler.days.${d}`, d)).join(', ');
    },

    _getRoutineDetails(routine) {
        const details = [];
        if (routine.target) details.push(`<b>Target:</b> ${routine.target}`);
        if (routine.volume !== undefined) details.push(`<b>Vol:</b> ${routine.volume}%`);
        if (routine.text) details.push(`<b>Speak:</b> "${routine.text.substring(0, 20)}${routine.text.length > 20 ? '...' : ''}"`);
        return details;
    },

    renderGatekeeper(gatekeeper) {
        const container = document.getElementById('gatekeeper-list');
        if (!container || !gatekeeper) return;

        container.innerHTML = '';
        Object.entries(gatekeeper).forEach(([category, config]) => {
            const item = SchedulerUI._createGatekeeperItem(category, config);
            container.appendChild(item);
        });
    },

    _createGatekeeperItem(category, config) {
        const type = config.allow ? 'Allow' : (config.deny ? 'Deny' : 'Always');
        const range = config.allow ? `${config.allow.start} - ${config.allow.end}` : (config.deny ? `${config.deny.start} - ${config.deny.end}` : '24h');

        const item = document.createElement('div');
        item.className = 'gk-item';
        item.innerHTML = `
            <div class="gk-header">
                <span class="gk-name">${category}</span>
                <span class="gk-range">${range} (${type})</span>
                <button class="gk-edit-btn" onclick="openGKEditor('${category}')" title="EDIT">✏️</button>
            </div>
            <div class="switch-inline">
                <label class="switch">
                    <input type="checkbox" ${config.enabled ? 'checked' : ''} onchange="toggleGK('${category}', this.checked)">
                    <span class="slider"></span>
                </label>
                <span style="font-size: 0.8rem; opacity: 0.7;">${config.enabled ? 'ENABLED' : 'DISABLED'}</span>
            </div>
        `;
        return item;
    }
};
