/**
 * AEGIS Routine Manager - Global Entry Point
 */

let currentSchedulerConfig = null;

async function openSchedulerManager() {
    console.log("[Scheduler-Index] Opening Manager Modal...");
    const modal = document.getElementById('scheduler-manager-modal');
    if (!modal) {
        console.error("[Scheduler-Index] Modal element not found!");
        return;
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    await refreshSchedulerUI();
    console.log("[Scheduler-Index] Modal open process finished.");
}

function closeSchedulerManager() {
    const modal = document.getElementById('scheduler-manager-modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

async function refreshSchedulerUI() {
    try {
        console.log("[Scheduler-Index] Starting UI refresh...");
        currentSchedulerConfig = await SchedulerAPI.getConfig();
        console.log("[Scheduler-Index] Config loaded, gatekeeper:", !!currentSchedulerConfig.gatekeeper, "routines:", currentSchedulerConfig.routines?.length);

        SchedulerUI.renderGatekeeper(currentSchedulerConfig.gatekeeper);
        SchedulerUI.renderRoutines(currentSchedulerConfig.routines);
    } catch (e) {
        console.error("[Scheduler] UI Refresh failed:", e);
    }
}

// --- Event Handlers (Global scope for HTML onclick) ---

function toggleGK(category, enabled) {
    if (currentSchedulerConfig && currentSchedulerConfig.gatekeeper[category]) {
        currentSchedulerConfig.gatekeeper[category].enabled = enabled;
        SchedulerUI.renderGatekeeper(currentSchedulerConfig.gatekeeper);
    }
}

function openGKEditor(category) {
    console.log(`[Scheduler-Index] openGKEditor called for: ${category}`);
    if (typeof GKEditor === 'undefined') {
        console.error("[Scheduler-Index] GKEditor module is not loaded!");
        return;
    }
    GKEditor.open(category, currentSchedulerConfig);
}

function closeGKEditor() {
    GKEditor.close();
}

function applyGKChanges() {
    const { category, type, config } = GKEditor.getData();
    if (!currentSchedulerConfig || !currentSchedulerConfig.gatekeeper[category]) return;

    const gk = currentSchedulerConfig.gatekeeper[category];
    const isEnabled = gk.enabled; // 기존 활성화 상태 유지

    // 기존 allow/deny 삭제 후 새로 설정
    delete gk.allow;
    delete gk.deny;
    gk[type] = config;
    gk.enabled = isEnabled;

    SchedulerUI.renderGatekeeper(currentSchedulerConfig.gatekeeper);
    closeGKEditor();
}

function toggleRoutine(id) {
    if (!currentSchedulerConfig) return;
    const routine = currentSchedulerConfig.routines.find(r => r.id === id);
    if (routine) {
        routine.enabled = !routine.enabled;
        SchedulerUI.renderRoutines(currentSchedulerConfig.routines);
    }
}

function deleteRoutine(id) {
    if (!currentSchedulerConfig) return;
    if (!confirm('Are you sure you want to delete this routine?')) return;
    currentSchedulerConfig.routines = currentSchedulerConfig.routines.filter(r => r.id !== id);
    SchedulerUI.renderRoutines(currentSchedulerConfig.routines);
}

function openRoutineEditor(id = null) {
    RoutineEditor.open(id, currentSchedulerConfig);
}

function closeRoutineEditor() {
    RoutineEditor.close();
}

function toggleActionFields() {
    RoutineEditor.toggleActionFields();
}

function applyRoutineChanges() {
    const data = RoutineEditor.getRoutineData();
    if (!data.name || !data.time) {
        alert("Please fill in Name and Time.");
        return;
    }
    if (data.days.length === 0) {
        alert("Please select at least one day.");
        return;
    }

    const id = document.getElementById('edit-routine-id').value;
    if (id) {
        const idx = currentSchedulerConfig.routines.findIndex(r => r.id === id);
        if (idx !== -1) currentSchedulerConfig.routines[idx] = data;
    } else {
        currentSchedulerConfig.routines.push(data);
    }

    SchedulerUI.renderRoutines(currentSchedulerConfig.routines);
    closeRoutineEditor();
}

async function saveSchedulerConfig() {
    const btn = document.querySelector('#scheduler-manager-modal .save-btn');
    const originalText = btn.innerText;
    btn.innerText = "⌛ SAVING CONFIG...";
    btn.disabled = true;

    try {
        const data = await SchedulerAPI.saveConfig(currentSchedulerConfig);
        if (data.status === 'success') {
            btn.innerText = "✅ ALL CHANGES SAVED!";
            btn.classList.add('success');

            if (window.briefingScheduler) await window.briefingScheduler.init();

            setTimeout(() => {
                btn.innerText = originalText;
                btn.classList.remove('success');
                btn.disabled = false;
                closeSchedulerManager();
            }, 1800);
        } else {
            throw new Error(data.message);
        }
    } catch (e) {
        alert("Save Failed: " + e.message);
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
