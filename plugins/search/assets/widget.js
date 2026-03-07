/**
 * AEGIS v2.0 Global Search Plugin
 * Handles floating search UI, Notion integration, and results rendering.
 */

export default {
    init: function (shadowRoot, context) {
        context.log("Initializing Global Search...");

        // UI Elements
        const win = shadowRoot.getElementById('notion-search-window');
        const header = shadowRoot.getElementById('search-window-header');
        const resizeHandle = shadowRoot.getElementById('search-window-resize');
        const closeBtn = shadowRoot.getElementById('search-close-btn');
        const statusEl = shadowRoot.getElementById('search-status');
        const listEl = shadowRoot.getElementById('search-results-list');

        // --- Window Management Internal Helpers ---
        const setupDraggable = (winEl, headEl) => {
            let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
            headEl.onmousedown = (e) => {
                e = e || window.event;
                e.preventDefault();
                p3 = e.clientX; p4 = e.clientY;
                document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
                document.onmousemove = (e) => {
                    e = e || window.event; e.preventDefault();
                    p1 = p3 - e.clientX; p2 = p4 - e.clientY;
                    p3 = e.clientX; p4 = e.clientY;
                    winEl.style.top = (winEl.offsetTop - p2) + "px";
                    winEl.style.left = (winEl.offsetLeft - p1) + "px";
                    winEl.style.transform = 'none';
                };
            };
        };

        const setupResizable = (winEl, handleEl) => {
            let ow = 0, oh = 0, omx = 0, omy = 0;
            handleEl.onmousedown = (e) => {
                e.preventDefault();
                ow = winEl.offsetWidth; oh = winEl.offsetHeight;
                omx = e.pageX; omy = e.pageY;
                const resize = (e) => {
                    const w = ow + (e.pageX - omx);
                    const h = oh + (e.pageY - omy);
                    if (w > 350) winEl.style.width = w + 'px';
                    if (h > 300) winEl.style.height = h + 'px';
                };
                const stop = () => { window.removeEventListener('mousemove', resize); window.removeEventListener('mouseup', stop); };
                window.addEventListener('mousemove', resize);
                window.addEventListener('mouseup', stop);
            };
        };

        // --- Global Controller ---
        const searchCtx = {
            open: (query = '') => {
                win.classList.add('active');
                if (query) searchCtx.search(query);
            },
            close: () => {
                win.classList.remove('active');
            },
            search: async (query) => {
                statusEl.textContent = `"${query}" 검색 중...`;
                listEl.innerHTML = '';
                try {
                    const res = await fetch(`/api/plugins/notion/search?query=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    if (data.success && data.items.length > 0) {
                        statusEl.textContent = `${data.items.length}개의 항목을 찾았습니다.`;
                        searchCtx.renderResults(data.items);
                    } else {
                        statusEl.textContent = "검색 결과가 없습니다.";
                    }
                } catch (e) {
                    statusEl.textContent = "검색 중 오류 발생.";
                }
            },
            renderResults: (items) => {
                listEl.innerHTML = '';
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
                    listEl.appendChild(li);
                });
            }
        };

        window.NotionSearchWindow = searchCtx;

        // --- Setup Elements ---
        setupDraggable(win, header);
        setupResizable(win, resizeHandle);
        closeBtn.addEventListener('click', () => searchCtx.close());

        context.log("Search v2.0 Ready.");
    },

    destroy: function () {
        window.NotionSearchWindow = null;
    }
};
