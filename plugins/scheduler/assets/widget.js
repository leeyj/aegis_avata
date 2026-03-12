export default {
    init: async function(root, context) {
        // Load dependencies through context.resolve helper for correct URL mapping
        const APIModule = await import(context.resolve('assets/api.js'));
        const UIModule = await import(context.resolve('assets/ui.js'));
        const EditorModule = await import(context.resolve('assets/editor.js'));

        context.applyI18n();

        const manager = {
            currentConfig: null,
            context: context,
            root: root
        };

        const api = new APIModule.default(context);
        manager.api = api;

        const ui = new UIModule.default(root, context, manager);
        manager.ui = ui;

        const editor = new EditorModule.default(root, context, manager);
        manager.editor = editor;

        manager.refreshSchedulerUI = async () => {
            try {
                manager.currentConfig = await api.getConfig();
                ui.renderGatekeeper(manager.currentConfig.gatekeeper);
                ui.renderRoutines(manager.currentConfig.routines);
            } catch (e) {
                console.error("[Scheduler] UI Refresh failed:", e);
            }
        };

        // Delegate events from root
        root.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');

            if (action === 'openRoutineEditor') editor.openRoutineEditor(id);
            else if (action === 'closeRoutineEditor') editor.closeRoutineEditor();
            else if (action === 'applyRoutineChanges') editor.applyRoutineChanges();
            else if (action === 'openGKEditor') editor.openGKEditor(id);
            else if (action === 'closeGKEditor') editor.closeGKEditor();
            else if (action === 'applyGKChanges') editor.applyGKChanges();
            else if (action === 'toggleRoutine') {
                const routine = manager.currentConfig.routines.find(r => r.id === id);
                if (routine) {
                    routine.enabled = !routine.enabled;
                    ui.renderRoutines(manager.currentConfig.routines);
                }
            }
            else if (action === 'deleteRoutine') {
                if (!confirm(context._t('scheduler.messages.confirm_delete') || '정말 삭제하시겠습니까?')) return;
                manager.currentConfig.routines = manager.currentConfig.routines.filter(r => r.id !== id);
                ui.renderRoutines(manager.currentConfig.routines);
            }
            else if (action === 'saveSchedulerConfig') {
                saveSchedulerConfig();
            }
        });

        root.addEventListener('change', (e) => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const action = el.getAttribute('data-action');
            const id = el.getAttribute('data-id');

            if (action === 'toggleTriggerType') {
                editor.toggleTriggerType();
            } else if (action === 'toggleActionFields') {
                editor.toggleActionFields();
            } else if (action === 'toggleGK') {
                if (manager.currentConfig && manager.currentConfig.gatekeeper[id]) {
                    manager.currentConfig.gatekeeper[id].enabled = e.target.checked;
                    ui.renderGatekeeper(manager.currentConfig.gatekeeper);
                }
            }
        });

        async function saveSchedulerConfig() {
            const btn = root.querySelector('.save-btn');
            const originalText = btn.innerText;
            btn.innerText = "⌛ SAVING CONFIG...";
            btn.disabled = true;

            try {
                const data = await api.saveConfig(manager.currentConfig);
                if (data.status === 'success') {
                    btn.innerText = "✅ ALL CHANGES SAVED!";
                    btn.style.boxShadow = "0 0 20px rgba(0,255,0, 0.4)";
                    
                    context.requestCore('SYSTEM_RELOAD_CONFIG');

                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.style.boxShadow = "";
                        btn.disabled = false;
                        context.requestCore('WIDGET_VISIBILITY_CHANGED', { id: 'scheduler', visible: false });
                    }, 1800);
                } else {
                    throw new Error(data.message);
                }
            } catch (err) {
                alert("Save Failed: " + err.message);
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }

        await manager.refreshSchedulerUI();
        context.onSystemEvent('SCHEDULER_SYNC', () => manager.refreshSchedulerUI());
    }
};
