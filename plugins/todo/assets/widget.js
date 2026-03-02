/**
 * AEGIS Todo Widget (v1.8.0 Plugin-X)
 */
export default {
    localTasks: [],
    isSyncing: false,
    updateTimer: null,

    init: async function (shadowRoot, context) {
        context.log("Todo Widget Initializing...");
        const listEl = shadowRoot.getElementById('todo-list');
        const input = shadowRoot.getElementById('todo-new-text');
        const addBtn = shadowRoot.getElementById('todo-add-btn');
        if (!listEl || !input || !addBtn) return;

        const renderTasks = () => {
            if (this.localTasks.length === 0) {
                listEl.innerHTML = `<div style="font-size: 12px; opacity: 0.5;">${context._t('widgets.no_objectives')}</div>`;
                return;
            }

            listEl.innerHTML = '';
            this.localTasks.forEach(task => {
                const item = document.createElement('div');
                item.className = `todo-item-container ${task.pendingCompletion ? 'pending' : ''}`;
                item.innerHTML = `
                    <div class="todo-check no-drag ${task.pendingCompletion ? 'checked' : ''}">
                        ${task.pendingCompletion ? '✓' : ''}
                    </div>
                    <div class="todo-content">
                        <div class="todo-title ${task.isTemp ? 'temp' : ''}">
                            ${task.title} ${task.isTemp ? `<span class="sync-tag">${context._t('widgets.todo_syncing')}</span>` : ''}
                        </div>
                        ${task.notes ? `<div class="todo-notes">${task.notes}</div>` : ''}
                    </div>
                `;

                const checkBtn = item.querySelector('.todo-check');
                checkBtn.onclick = async () => {
                    if (task.pendingCompletion) return;
                    task.pendingCompletion = true;
                    renderTasks();
                    try {
                        await fetch('/api/plugins/todo/complete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tasklist_id: task.tasklist_id, task_id: task.id })
                        });
                        this.localTasks = this.localTasks.filter(t => t.id !== task.id);
                        renderTasks();
                    } catch (e) {
                        task.pendingCompletion = false;
                        renderTasks();
                    }
                };

                listEl.appendChild(item);
            });
        };

        const handleAdd = async () => {
            const title = input.value.trim();
            if (!title) return;

            const tempTask = { id: Date.now(), title, isTemp: true, tasklist_id: 'temp' };
            this.localTasks.unshift(tempTask);
            input.value = '';
            renderTasks();

            try {
                const res = await fetch('/api/plugins/todo/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title })
                });
                const result = await res.json();

                // [Sync FIX] 추가 성공 시 임시 타스크 제거 후 목록 갱신
                this.localTasks = this.localTasks.filter(t => t !== tempTask);

                if (result.status === 'SUCCESS' || result.status === 'success') {
                    await updateTodo();
                } else {
                    renderTasks();
                }
            } catch (e) {
                this.localTasks = this.localTasks.filter(t => t !== tempTask);
                renderTasks();
            }
        };

        const updateTodo = async () => {
            if (this.isSyncing) return;
            this.isSyncing = true;
            try {
                const res = await fetch('/api/plugins/todo/list');
                const data = await res.json();
                if (data.status === "SUCCESS") {
                    const pendingAdds = this.localTasks.filter(t => t.isTemp);
                    this.localTasks = [...pendingAdds, ...data.tasks];
                    renderTasks();
                }
            } catch (e) {
                context.log("Todo update failed: " + e.message);
            } finally {
                this.isSyncing = false;
            }
        };

        addBtn.onclick = handleAdd;
        input.onkeypress = (e) => { if (e.key === 'Enter') handleAdd(); };

        updateTodo();

        context.registerSchedule('todo', 'min', () => {
            updateTodo();
        });
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        console.log("[Plugin-X] Todo Widget Destroyed.");
    }
};
