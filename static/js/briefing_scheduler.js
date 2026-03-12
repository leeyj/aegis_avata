/**
 * AEGIS Briefing Scheduler (Modular Orchestrator)
 * Coordinates filtering, ticking, and action execution.
 */
import { schedulerGatekeeper } from './loader/scheduler_gatekeeper.js';
import { schedulerTick } from './loader/scheduler_tick.js';
import { schedulerActions } from './loader/scheduler_actions.js';

class BriefingScheduler {
    constructor() {
        this.config = null;
        this.lastRoutineExecution = {};
        this.isLoaded = false;
        this.widgets = [];
    }

    async init() {
        if (this.isLoaded) return;
        try {
            const res = await fetch('/api/plugins/scheduler/config');
            if (res.ok) {
                this.config = await res.json();
                this.isLoaded = true;
                schedulerTick.start(this);
                console.log("[Scheduler] Modular Engine Initialized.");
            }
        } catch (e) {
            console.error("[Scheduler] Init failed:", e);
        }
    }

    isAllowed(category) {
        return schedulerGatekeeper.isAllowed(category, this.config);
    }

    registerWidget(id, type, callback) {
        this.widgets = this.widgets.filter(w => w.id !== id);
        this.widgets.push({ id, type, callback });
        console.log(`[Scheduler] Widget registered: ${id} (${type})`);
    }

    async checkRoutines() {
        if (!this.isLoaded || !this.config?.routines) return;

        const now = new Date();
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentDay = now.getDay();
        const todayDateStr = now.toISOString().split('T')[0];

        for (const routine of this.config.routines) {
            if (!routine.enabled || !routine.days.includes(currentDay)) continue;

            // Condition-based polling (v1.8)
            if (routine.condition && (routine.time === 'every_1m' || routine.time === 'condition')) {
                await this._checkConditionRoutine(routine, now);
                continue;
            }

            // Time-based triggers
            let shouldTrigger = false;
            if (routine.time === currentTimeStr) shouldTrigger = true;
            else if (routine.time === 'hourly' && now.getMinutes() === 0) shouldTrigger = true;

            if (shouldTrigger) {
                const executionKey = routine.time === 'hourly' ? `${todayDateStr}_${now.getHours()}` : todayDateStr;
                if (this.lastRoutineExecution[routine.id] !== executionKey) {
                    this.executeAction(routine);
                    this.lastRoutineExecution[routine.id] = executionKey;
                }
            }
        }
    }

    async _checkConditionRoutine(routine, now) {
        const cond = routine.condition;
        if (!cond?.source || !cond?.field) return;

        const cooldownMs = (routine.cooldown_min || 30) * 60 * 1000;
        const lastExec = this.lastRoutineExecution[routine.id];
        if (lastExec && (now.getTime() - lastExec) < cooldownMs) return;

        try {
            const res = await fetch(cond.source);
            if (!res.ok) return;
            const data = await res.json();

            let actualValue = data;
            for (const key of cond.field.split('.')) actualValue = actualValue?.[key];
            if (actualValue === undefined || actualValue === null) return;

            const sensorType = cond.type || 'number';
            if (sensorType === 'number' && typeof actualValue !== 'number') {
                const parsed = parseFloat(actualValue);
                if (!isNaN(parsed)) actualValue = parsed;
            } else if (sensorType === 'boolean') actualValue = Boolean(actualValue);

            const targetValue = cond.value;
            let matched = false;
            switch (cond.operator) {
                case '>=': matched = actualValue >= targetValue; break;
                case '<=': matched = actualValue <= targetValue; break;
                case '>': matched = actualValue > targetValue; break;
                case '<': matched = actualValue < targetValue; break;
                case '==': matched = actualValue == targetValue; break;
                case '!=': matched = actualValue != targetValue; break;
            }

            if (matched) {
                routine._sensorValue = actualValue;
                routine._sensorThreshold = targetValue;
                this.executeAction(routine);
                this.lastRoutineExecution[routine.id] = now.getTime();
            }
        } catch (e) {
            console.error(`[Scheduler] Polling error: ${routine.name}`, e);
        }
    }

    executeAction(routine) {
        schedulerActions.execute(routine);
    }
}

// Global instance mapping for backward compatibility
window.briefingScheduler = new BriefingScheduler();
window.briefingScheduler.init();
