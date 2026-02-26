/**
 * AEGIS Widget Module - Todo (Google Tasks)
 */
async function startTodo() {
    const listEl = document.getElementById('todo-list');
    if (!listEl) return;

    let localTasks = []; // 로컬 데이터 캐시 (느슨한 연동의 핵심)
    let isSyncing = false;

    const renderTasks = () => {
        if (localTasks.length === 0) {
            listEl.innerHTML = '<div style="font-size: 12px; opacity: 0.5;">No active tasks today.</div>';
            return;
        }

        listEl.innerHTML = '';
        localTasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'todo-item-container';
            item.style.marginBottom = '10px';
            item.style.display = 'flex';
            item.style.alignItems = 'flex-start';
            item.style.gap = '10px';
            item.style.padding = '8px';
            item.style.background = 'rgba(255,255,255,0.02)';
            item.style.borderRadius = '4px';
            item.style.transition = 'all 0.2s';

            if (task.pendingCompletion) {
                item.style.opacity = '0.4';
                item.style.textDecoration = 'line-through';
            }

            item.innerHTML = `
                <div class="todo-check no-drag" style="margin-top: 2px; width: 14px; height: 14px; border: 1px solid var(--neon); border-radius: 3px; flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; background: ${task.pendingCompletion ? 'var(--neon)' : 'transparent'};">
                    ${task.pendingCompletion ? '✓' : ''}
                </div>
                <div style="flex:1" class="no-drag">
                    <div style="font-size: 13px; font-weight: 500; color: ${task.isTemp ? 'var(--neon)' : 'white'}; opacity: ${task.isTemp ? '0.7' : '1'};">
                        ${task.title} ${task.isTemp ? '<span style="font-size:9px; opacity:0.5;">(Syncing...)</span>' : ''}
                    </div>
                    ${task.notes ? `<div style="font-size: 10px; opacity: 0.5; margin-top: 2px;">${task.notes}</div>` : ''}
                </div>
            `;

            const checkBtn = item.querySelector('.todo-check');
            checkBtn.onclick = async () => {
                if (task.pendingCompletion) return;

                // 1. 즉시 UI 반영 (Optimistic Update)
                task.pendingCompletion = true;
                renderTasks();

                // 2. 백그라운드 동기화 (느슨한 연동)
                try {
                    await fetch('/complete_todo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tasklist_id: task.tasklist_id, task_id: task.id })
                    });
                    // 서버 응답과 상관없이 로컬에선 이미 끝난 일로 처리
                    localTasks = localTasks.filter(t => t.id !== task.id);
                    renderTasks();
                } catch (e) {
                    console.error("[Todo] Sync failed:", e);
                    task.pendingCompletion = false; // 실패 시에만 복구 (선택적)
                    renderTasks();
                }
            };

            listEl.appendChild(item);
        });
    };

    // UI 보강: 입력 폼 추가
    const panel = document.getElementById('p-todo');
    if (panel && !document.getElementById('todo-input-group')) {
        const inputGroup = document.createElement('div');
        inputGroup.id = 'todo-input-group';
        inputGroup.className = 'no-drag';
        inputGroup.style.display = 'flex';
        inputGroup.style.gap = '5px';
        inputGroup.style.marginBottom = '15px';
        inputGroup.innerHTML = `
            <input type="text" id="todo-new-text" placeholder="Add a task..." style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); color:white; padding:6px 10px; border-radius:4px; font-size:12px;">
            <button id="todo-add-btn" style="background:var(--neon); color:black; border:none; padding:5px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">+</button>
        `;
        panel.insertBefore(inputGroup, listEl);

        const input = document.getElementById('todo-new-text');
        const handleAdd = async () => {
            const title = input.value.trim();
            if (!title) return;

            // 1. 즉시 UI 반영
            const tempTask = { id: Date.now(), title, isTemp: true, tasklist_id: 'temp' };
            localTasks.unshift(tempTask);
            input.value = '';
            renderTasks();

            // 2. 백그라운드 동기화
            try {
                const res = await fetch('/add_todo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title })
                });
                const result = await res.json();
                if (result.status === 'SUCCESS') {
                    // 실제 ID로 교체하거나 다음 폴링 때 갱신
                    updateTodo();
                }
            } catch (e) {
                console.error("[Todo] Add sync failed:", e);
                localTasks = localTasks.filter(t => t !== tempTask);
                renderTasks();
            }
        };

        document.getElementById('todo-add-btn').onclick = handleAdd;
        input.onkeypress = (e) => { if (e.key === 'Enter') handleAdd(); };
    }

    const updateTodo = async () => {
        if (isSyncing) return;
        isSyncing = true;
        try {
            const res = await fetch('/todo_list');
            const data = await res.json();

            if (data.status === "SUCCESS") {
                // 현재 로컬에서 '진행 중'인 작업(임시 추가 등)은 유지하고 서버 데이터와 병합
                const pendingAdds = localTasks.filter(t => t.isTemp);
                localTasks = [...pendingAdds, ...data.tasks];
                renderTasks();
            }
        } catch (e) { }
        finally { isSyncing = false; }
    };

    updateTodo();
    setInterval(updateTodo, 60000); // 백그라운드 동기화 주기는 1분으로 설정
}
