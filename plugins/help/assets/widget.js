/**
 * AEGIS Tactical Help Center JS (v1.1)
 * Supports Auto-Discovery & Multilingual Docs
 */
export default {
    helpData: null,
    currentTab: null,

    init: async function (shadowRoot, context) {
        context.log("Help Center Initializing (Multilingual Mode)...");

        // UI Elements
        const tabContainer = shadowRoot.getElementById('tab-container');
        const markdownViewer = shadowRoot.getElementById('markdown-viewer');
        const systematicOverlay = shadowRoot.getElementById('systematic-overlay');
        const systematicGrid = shadowRoot.getElementById('grid-systematic');

        // Shortcut Logic
        this._handleKeyDown = (e) => {
            const isInputActive = (document.activeElement.tagName === 'INPUT' ||
                document.activeElement.tagName === 'TEXTAREA' ||
                (shadowRoot.activeElement && (shadowRoot.activeElement.tagName === 'INPUT' || shadowRoot.activeElement.tagName === 'TEXTAREA')));

            // Shift + H (Case-insensitive 'h' check just in case, but 'H' is standard for Shift+h)
            if (!isInputActive && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
                // [Fix] 나타나기가 안되는 현상 수정: 
                // togglePanel을 사용하면 panelVisibility가 false가 되어 다음 시도 시 차단되므로,
                // 단축키는 항상 작동하되 togglePanel을 통해 전체 상태를 동기화하도록 변경합니다.
                e.preventDefault();
                if (window.togglePanel) {
                    const wrapper = document.getElementById('help');
                    // 현재 display 상태를 기준으로 반전시킴
                    const isVisible = wrapper && wrapper.style.display !== 'none';
                    window.togglePanel('help', !isVisible);
                }
            }
        };
        window.addEventListener('keydown', this._handleKeyDown);

        // Labels (Fallback provided during init, updated after fetchAllData)
        this.labels = {
            loading: 'Loading archives...',
            error: 'Failed to access data',
            statusTab: 'Status',
            noData: 'No tactical data available.',
            actions: 'Actions',
            aliases: 'Aliases',
            intelligenceGap: 'Intelligence Gap'
        };

        const loadDoc = async (docName) => {
            markdownViewer.innerHTML = `<div class="loading-spinner">${this.labels.loading} [${docName}]</div>`;
            try {
                const res = await fetch(`/api/plugins/help/doc/${docName}`);
                const data = await res.json();
                if (data.status === 'success') {
                    const renderer = window.marked || (window.parent && window.parent.marked);
                    if (renderer) {
                        markdownViewer.innerHTML = renderer.parse(data.content);
                    } else {
                        markdownViewer.innerHTML = `<pre style="white-space: pre-wrap;">${data.content}</pre>`;
                    }
                } else {
                    markdownViewer.innerHTML = `<div class="error">${this.labels.error}: ${docName}</div>`;
                }
            } catch (e) {
                markdownViewer.innerHTML = `<div class="error">${this.labels.intelligenceGap}: ${e.message}</div>`;
            }
        };

        const renderTabs = (docs) => {
            // Preset icon mapping
            const presetIcons = {
                'systematic': '⚡ ',
                'hybrid': '🧠 ',
                'pure-ai': '🌐 ',
                'pure_ai': '🌐 '
            };

            const docTabs = docs.map(doc => {
                const label = doc.replace('_', ' ').replace('-', ' ');
                const icon = presetIcons[doc] || '📄 ';
                const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
                return `<button class="tab-btn no-drag ${this.currentTab === doc ? 'active' : ''}" data-tab="${doc}">${icon}${formattedLabel}</button>`;
            }).join('');

            tabContainer.innerHTML = docTabs + `<button class="tab-btn no-drag ${this.currentTab === 'status' ? 'active' : ''}" data-tab="status">📊 ${this.labels.statusTab}</button>`;

            // Attach Click Events
            tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation(); // 드래그 이벤트 전파 방지
                    const tab = btn.dataset.tab;
                    this.currentTab = tab;
                    tabContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    if (tab === 'status') {
                        markdownViewer.style.display = 'none';
                        systematicOverlay.style.display = 'block';
                        renderStatus();
                    } else {
                        markdownViewer.style.display = 'block';
                        systematicOverlay.style.display = 'none';
                        await loadDoc(tab);
                    }
                };
            });
        };

        const fetchDocs = async () => {
            try {
                const res = await fetch('/api/plugins/help/docs');
                const data = await res.json();
                if (data.status === 'success' && data.docs.length > 0) {
                    if (!this.currentTab) this.currentTab = data.docs[0];
                    renderTabs(data.docs);
                    if (this.currentTab !== 'status') await loadDoc(this.currentTab);
                } else {
                    tabContainer.innerHTML = `<button class="tab-btn no-drag active" data-tab="status">📊 ${this.labels.statusTab}</button>`;
                    this.currentTab = 'status';
                    renderStatus();
                }
            } catch (e) { context.log("Failed to load docs list: " + e.message); }
        };

        const fetchAllData = async () => {
            try {
                const res = await fetch('/api/plugins/help/data');
                const data = await res.json();
                if (data.status === 'success') {
                    this.helpData = data.plugins;
                    if (data.labels) {
                        this.labels = {
                            loading: data.labels.loading || 'Loading...',
                            error: data.labels.error || 'Error',
                            statusTab: data.labels.status || 'Status',
                            noData: data.labels.no_data || 'No Data',
                            actions: data.labels.actions || 'Actions',
                            aliases: data.labels.aliases || 'Aliases',
                            intelligenceGap: data.labels.doc_not_found || 'Not Found'
                        };
                        // 탭 이름 갱신을 위해 renderDocs 이전에 fetch 되었다면 다행이고, 
                        // 아니면 여기서 fetchDocs를 다시 부르거나 탭만 갱신
                    }
                }
            } catch (e) { context.log("Failed to load status data: " + e.message); }
        };

        const renderStatus = () => {
            if (!this.helpData) {
                systematicGrid.innerHTML = `<div class="p-error">${this.labels.noData}</div>`;
                return;
            }
            systematicGrid.innerHTML = this.helpData
                .map(p => `
                    <div class="plugin-card no-drag">
                        <div class="p-header no-drag">
                            <span class="p-name no-drag">${p.id.toUpperCase()}</span>
                            <span class="p-icons no-drag">${p.support_systematic ? '⚡' : ''}${p.support_hybrid ? '🧠' : ''}</span>
                        </div>
                        <div class="p-status no-drag">
                            ${p.actions.length} ${this.labels.actions} | ${p.aliases.length} ${this.labels.aliases}
                        </div>
                    </div>
                `).join('');
        };

        // Initial Load
        await fetchAllData();
        await fetchDocs();
    },

    destroy: function () {
        if (this._handleKeyDown) {
            window.removeEventListener('keydown', this._handleKeyDown);
        }
        console.log("[Plugin-X] Help Center Destroyed.");
    }
};

