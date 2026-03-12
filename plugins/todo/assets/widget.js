/**
 * AEGIS Todo Widget (v1.8.0 Plugin-X)
 */
export default {
    localTasks: [],
    isSyncing: false,
    updateTimer: null,

    init: async function (root, context) {
        // [CRITICAL] 명령어 즉시 등록
        context.registerCommand('/todo', (cmd) => {
            const title = cmd.includes(' ') ? cmd.substring(cmd.indexOf(' ') + 1).trim() : '';
            if (title) {
                handleAdd(title);
            } else {
                context.appendLog('SYSTEM', '작성할 할 일 내용을 입력해주세요. (예: /todo 방화벽 설치)');
            }
        });

        context.log("Todo Widget Initializing...");
        const listEl = root.getElementById('todo-list');
        const input = root.getElementById('todo-new-text');
        const addBtn = root.getElementById('todo-add-btn');
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
                        await context.fetch('complete', {
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

        const handleAdd = async (externalTitle = null) => {
            const title = (externalTitle || input.value).trim();
            if (!title || title === '/todo') return;

            const tempTask = { id: Date.now(), title, isTemp: true, tasklist_id: 'temp' };
            this.localTasks.unshift(tempTask);
            if (!externalTitle) input.value = '';
            renderTasks();

            try {
                const res = await context.fetch('add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title })
                });
                const result = await res.json();

                // [Sync FIX] 추가 성공 시 임시 타스크 제거 후 목록 갱신
                this.localTasks = this.localTasks.filter(t => t !== tempTask);

                if (result.status === 'SUCCESS' || result.status === 'success') {
                    if (externalTitle) context.appendLog('TODO', `✅ 새로운 목표가 등록되었습니다: ${title}`);
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
                const res = await context.fetch('list');
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

        context.onSystemEvent('TODO_SYNC', () => updateTodo());
        context.onSystemEvent('TODO_LIST_SYNC', () => updateTodo());

        context.registerSchedule('todo', 'min', () => {
            updateTodo();
        });
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
        console.log("[Plugin-X] Todo Widget Destroyed.");
    }
};
