/**
 * AEGIS Widget Module - Todo (Google Tasks)
 */
async function startTodo() {
    const listEl = document.getElementById('todo-list');
    if (!listEl) return;

    let config = { refresh_interval_ms: 300000 };
    try {
        const resConfig = await fetch('/google_config');
        config = Object.assign(config, await resConfig.json());
    } catch (e) { }

    const updateTodo = async () => {
        try {
            const res = await fetch('/todo_list');
            const data = await res.json();

            if (data.status === "SUCCESS") {
                if (data.tasks.length === 0) {
                    listEl.innerHTML = '<div style="font-size: 12px; opacity: 0.5;">No active tasks today.</div>';
                } else {
                    listEl.innerHTML = '';
                    data.tasks.forEach(task => {
                        const item = document.createElement('div');
                        item.style.marginBottom = '8px';
                        item.style.display = 'flex';
                        item.style.alignItems = 'flex-start';
                        item.style.gap = '8px';
                        item.innerHTML = `
                            <div style="margin-top: 3px; width: 10px; height: 10px; border: 1px solid var(--neon); border-radius: 2px; flex-shrink: 0; opacity: 0.6;"></div>
                            <div>
                                <div style="font-size: 13px; font-weight: 500;">${task.title}</div>
                                ${task.notes ? `<div style="font-size: 10px; opacity: 0.5; margin-top: 2px;">${task.notes}</div>` : ''}
                            </div>
                        `;
                        listEl.appendChild(item);
                    });
                }
            } else {
                listEl.innerHTML = `<div style="font-size: 11px; opacity: 0.5;">(Tasks status: ${data.message || 'Waiting'})</div>`;
            }
        } catch (e) { }
    };

    updateTodo();
    setInterval(updateTodo, config.refresh_interval_ms || 300000);
}
