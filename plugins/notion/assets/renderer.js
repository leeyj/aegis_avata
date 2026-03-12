export default class NotionRenderer {
    constructor(root, api, context) {
        this.root = root;
        this.api = api;
        this.context = context;
        this.listContainer = root.getElementById('notion-list');
    }

    async refreshNotion(limit = 10) {
        if (!this.listContainer) return;

        try {
            const data = await this.api.getRecentItems(limit);
            if (data.success && data.items && data.items.length > 0) {
                this.listContainer.innerHTML = data.items.map(item => {
                    const date = new Date(item.created_time);
                    const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                    return `
                        <div class="notion-item" data-id="${item.id}">
                            <span class="notion-item-title">${item.title}</span>
                            <span class="notion-item-time">${dateStr}</span>
                        </div>
                    `;
                }).join('');

                // Click event binding (safely encapsulated here, not in window bounds)
                this.root.querySelectorAll('.notion-item').forEach(el => {
                    el.onclick = () => {
                        const id = el.getAttribute('data-id').replace(/-/g, '');
                        window.open(`https://www.notion.so/${id}`, '_blank');
                    };
                });
            } else if (data.success && data.items && data.items.length === 0) {
                this.listContainer.innerHTML = '<div class="loading-text" style="opacity: 0.5;">Empty (No recent items found)</div>';
            } else {
                this.listContainer.innerHTML = '<div class="loading-text">데이터를 불러오지 못했습니다.</div>';
            }
        } catch (error) {
            this.listContainer.innerHTML = '<div class="loading-text">서버 연결 오류</div>';
        }
    }
}
