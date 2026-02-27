/**
 * AEGIS Window Manager - Floating & Resizable Windows
 */
const WindowManager = {
    makeDraggable: function (winElement, headerElement) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        headerElement.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // Get mouse position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // Calculate new position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // Set element's new position
            winElement.style.top = (winElement.offsetTop - pos2) + "px";
            winElement.style.left = (winElement.offsetLeft - pos1) + "px";

            // Remove transform centering if dragging
            winElement.style.transform = 'none';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    },

    makeResizable: function (winElement, handleElement) {
        let originalWidth = 0;
        let originalHeight = 0;
        let originalX = 0;
        let originalY = 0;
        let originalMouseX = 0;
        let originalMouseY = 0;

        handleElement.addEventListener('mousedown', function (e) {
            e.preventDefault();
            originalWidth = parseFloat(getComputedStyle(winElement, null).getPropertyValue('width').replace('px', ''));
            originalHeight = parseFloat(getComputedStyle(winElement, null).getPropertyValue('height').replace('px', ''));
            originalX = winElement.getBoundingClientRect().left;
            originalY = winElement.getBoundingClientRect().top;
            originalMouseX = e.pageX;
            originalMouseY = e.pageY;

            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResize);
        });

        function resize(e) {
            const width = originalWidth + (e.pageX - originalMouseX);
            const height = originalHeight + (e.pageY - originalMouseY);

            if (width > 350) winElement.style.width = width + 'px';
            if (height > 300) winElement.style.height = height + 'px';
        }

        function stopResize() {
            window.removeEventListener('mousemove', resize);
        }
    }
};

/**
 * Notion Search Window Controller
 */
const NotionSearchWindow = {
    init: function () {
        const win = document.getElementById('notion-search-window');
        const header = document.getElementById('search-window-header');
        const handle = document.getElementById('search-window-resize');

        if (win && header) {
            WindowManager.makeDraggable(win, header);
        }
        if (win && handle) {
            WindowManager.makeResizable(win, handle);
        }
    },

    open: function (query = '') {
        const win = document.getElementById('notion-search-window');
        if (!win) return;

        win.classList.add('active');
        if (query) {
            this.search(query);
        }
    },

    close: function () {
        const win = document.getElementById('notion-search-window');
        if (win) win.classList.remove('active');
    },

    search: async function (query) {
        const statusEl = document.getElementById('search-status');
        const listEl = document.getElementById('search-results-list');

        statusEl.textContent = `"${query}" 검색 중...`;
        listEl.innerHTML = '';

        try {
            const response = await fetch(`/api/notion/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.success && data.items.length > 0) {
                statusEl.textContent = `${data.items.length}개의 항목을 찾았습니다.`;
                this.renderResults(data.items);
            } else {
                statusEl.textContent = "검색 결과가 없습니다.";
            }
        } catch (e) {
            console.error("Notion Search Error:", e);
            statusEl.textContent = "검색 중 오류가 발생했습니다.";
        }
    },

    renderResults: function (items) {
        const listEl = document.getElementById('search-results-list');
        listEl.innerHTML = '';

        const iconMap = {
            'database': '📂',
            'page': '📄'
        };

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'search-item';

            const timeStr = new Date(item.updated_time).toLocaleString('ko-KR', {
                month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            li.innerHTML = `
                <div class="item-icon">${iconMap[item.type] || '📝'}</div>
                <div class="item-info">
                    <div class="item-title">${item.title}</div>
                    <div class="item-meta">
                        <span class="item-type">${item.type}</span>
                        <span class="item-time">최근 수정: ${timeStr}</span>
                    </div>
                </div>
            `;

            li.onclick = () => window.open(item.url, '_blank');
            listEl.appendChild(li);
        });
    }
};

// Global Exposure
window.NotionSearchWindow = NotionSearchWindow;
document.addEventListener('DOMContentLoaded', () => NotionSearchWindow.init());
