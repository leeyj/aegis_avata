export default class NotionSearch {
    constructor(root, api, context) {
        this.root = root;
        this.api = api;
        this.context = context;
        this.win = root.getElementById('notion-search-window');
        this.statusEl = root.getElementById('search-status');
        this.listEl = root.getElementById('search-results-list');
        
        this.init();
    }

    init() {
        if (!this.win) return;

        const header = this.root.getElementById('search-window-header');
        const resizeHandle = this.root.getElementById('search-window-resize');
        const closeBtn = this.root.getElementById('search-close-btn');

        this.setupDraggable(this.win, header);
        this.setupResizable(this.win, resizeHandle);
        closeBtn.addEventListener('click', () => this.close());
    }

    open(query = '') {
        if (!this.win) return;
        this.win.classList.add('active');
        if (query) this.search(query);
    }

    close() {
        if (!this.win) return;
        this.win.classList.remove('active');
    }

    async search(query) {
        this.statusEl.textContent = `"${query}" 검색 중...`;
        this.listEl.innerHTML = '';
        try {
            const data = await this.api.searchItems(query);
            if (data.success && data.items && data.items.length > 0) {
                this.statusEl.textContent = `${data.items.length}개의 항목을 찾았습니다.`;
                this.renderResults(data.items);
            } else {
                this.statusEl.textContent = "검색 결과가 없습니다.";
            }
        } catch (e) {
            this.statusEl.textContent = "검색 중 오류 발생.";
        }
    }

    renderResults(items) {
        this.listEl.innerHTML = '';
        const iconMap = { 'database': '📂', 'page': '📄' };
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'search-item';
            const timeStr = new Date(item.updated_time).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            li.innerHTML = `
                <div class="item-icon" style="font-size: 20px;">${iconMap[item.type] || '📝'}</div>
                <div class="item-info" style="flex:1;">
                    <div class="item-title" style="color:#fff; font-weight:500;">${item.title}</div>
                    <div class="item-meta" style="font-size:11px; color:#888;">
                        <span class="item-type" style="color:#00d2ff; font-weight:bold;">${item.type}</span> | 최근 수정: ${timeStr}
                    </div>
                </div>
            `;
            li.onclick = () => window.open(item.url, '_blank');
            this.listEl.appendChild(li);
        });
    }

    setupDraggable(winEl, headEl) {
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
        headEl.onmousedown = (e) => {
            e = e || window.event;
            e.preventDefault();
            p3 = e.clientX; p4 = e.clientY;
            document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
            document.onmousemove = (mvEvent) => {
                mvEvent = mvEvent || window.event; mvEvent.preventDefault();
                p1 = p3 - mvEvent.clientX; p2 = p4 - mvEvent.clientY;
                p3 = mvEvent.clientX; p4 = mvEvent.clientY;
                winEl.style.top = (winEl.offsetTop - p2) + "px";
                winEl.style.left = (winEl.offsetLeft - p1) + "px";
                winEl.style.transform = 'none';
            };
        };
    }

    setupResizable(winEl, handleEl) {
        let ow = 0, oh = 0, omx = 0, omy = 0;
        handleEl.onmousedown = (e) => {
            e.preventDefault();
            ow = winEl.offsetWidth; oh = winEl.offsetHeight;
            omx = e.pageX; omy = e.pageY;
            const resize = (mvEvent) => {
                const w = ow + (mvEvent.pageX - omx);
                const h = oh + (mvEvent.pageY - omy);
                if (w > 350) winEl.style.width = w + 'px';
                if (h > 300) winEl.style.height = h + 'px';
            };
            const stop = () => { 
                window.removeEventListener('mousemove', resize); 
                window.removeEventListener('mouseup', stop); 
            };
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stop);
        };
    }
}
