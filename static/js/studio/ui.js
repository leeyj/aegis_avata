// --- Studio UI: Draggable Panels & Assets Rendering ---

function renderAssetLists() {
    const mList = document.getElementById('motion-list');
    const eList = document.getElementById('expression-list');
    if (!mList || !eList) return;

    mList.innerHTML = '';
    window.modelAssets.motions.forEach((m, idx) => {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.innerHTML = `<span style="opacity:0.5; font-size:10px;">[M]</span> ${m.split('/').pop()}`;
        item.onclick = () => {
            if (window.currentAvatar) {
                try {
                    window.currentAvatar.motion("AllMotions", idx, 3);
                } catch (err) {
                    const groups = Object.keys(window.currentAvatar.internalModel.motionManager.motionGroups);
                    if (groups.length > 0) window.currentAvatar.motion(groups[0], idx, 3);
                }
            }
            if (typeof startMapping === 'function') startMapping('motion', m, item);
        };
        mList.appendChild(item);
    });

    eList.innerHTML = '';
    window.modelAssets.expressions.forEach(e => {
        const item = document.createElement('div');
        item.className = 'asset-item';
        const name = e.split('/').pop().replace(/\.exp3?\.json/, '');
        item.innerHTML = `<span style="opacity:0.5; font-size:10px;">[E]</span> ${name}`;
        item.onclick = () => {
            if (window.currentAvatar) window.currentAvatar.expression(name);
            if (typeof startMapping === 'function') startMapping('expression', e, item);
        };
        eList.appendChild(item);
    });
}

function makeDraggable(el) {
    if (!el) return;
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = el.querySelector('h2') || el.querySelector('.panel-header');

    if (header) {
        header.onmousedown = dragMouseDown;
    } else {
        el.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
        el.style.right = 'auto';
        el.style.bottom = 'auto'; // 하단 고정 해제
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// 초기화 시 드래그 활성화
document.addEventListener('DOMContentLoaded', () => {
    makeDraggable(document.querySelector('.controls'));
    makeDraggable(document.getElementById('alias-sidebar'));
    makeDraggable(document.getElementById('simulator-panel'));
});
