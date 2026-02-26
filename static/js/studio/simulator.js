// --- 스튜디오 시뮬레이터: 리액션 트리거 및 검증 로직 ---

/**
 * reactions.json 데이터를 불러와 시스템에 정의된 모든 리액션 경로를 버튼으로 생성합니다.
 * 이를 통해 복잡한 이벤트 연동이 실제로 어떻게 표현되는지 즉시 테스트할 수 있습니다.
 */
async function initSimulator() {
    try {
        const res = await fetch('/studio/api/reactions');
        window.reactionsData = await res.json();
        const container = document.getElementById('simulator-buttons');
        container.innerHTML = '';

        // 리액션 설정 파일의 계층 구조를 재귀적으로 탐색하여 
        // 실제로 'actions' 리스트가 정의된 최종 경로들을 찾아냅니다. (예: gmail.new_mail)
        const findActionPaths = (obj, prefix = '') => {
            let paths = [];
            for (const key in obj) {
                const currentPath = prefix ? `${prefix}.${key}` : key;
                if (obj[key] && typeof obj[key] === 'object') {
                    if (obj[key].actions && Array.isArray(obj[key].actions)) {
                        paths.push({ id: currentPath, label: currentPath });
                    } else {
                        paths = paths.concat(findActionPaths(obj[key], currentPath));
                    }
                }
            }
            return paths;
        };

        const targets = findActionPaths(window.reactionsData);

        targets.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'simulator-btn';
            btn.style.fontSize = '0.7rem';
            btn.innerText = t.label;
            btn.onclick = () => simulateReaction(t.id);
            container.appendChild(btn);
        });
    } catch (e) { console.error("Simulator init failed", e); }
}

function simulateReaction(path) {
    if (!window.currentAvatar) return;
    const keys = path.split('.');
    let target = window.reactionsData;
    for (const key of keys) target = target ? target[key] : null;

    if (!target || !target.actions) return;

    console.log(`[Simulator] Triggering: ${path}`);
    const ttsBox = document.getElementById('tts-preview');
    const ttsContent = document.getElementById('tts-content');
    const logArea = document.getElementById('simulator-log');

    let logLines = [];

    target.actions.forEach(action => {
        if (action.type === 'MOTION' || action.type === 'EVENT') {
            const alias = action.alias || (action.value === 'HAPPY_DANCE' ? 'dance' : null);
            logLines.push(`<span style="color:#5865f2;">[MOTION]</span> ${alias}`);
            const file = window.currentAliasData.motions[alias];
            if (file) {
                const idx = window.modelAssets.motions.indexOf(file);
                if (idx !== -1) window.currentAvatar.motion("AllMotions", idx, 3);
            }
        } else if (action.type === 'EMOTION') {
            logLines.push(`<span style="color:#f1c40f;">[EMOTION]</span> ${action.alias}`);
            const file = window.currentAliasData.expressions[action.alias];
            if (file) {
                const name = file.split('/').pop().replace(/\.exp3?\.json/, '');
                window.currentAvatar.expression(name);
            }
        } else if (action.type === 'TTS') {
            logLines.push(`<span style="color:#2ecc71;">[TTS]</span> Triggered`);
            ttsBox.style.display = 'block';
            ttsContent.innerText = action.template.replace(/{.*?}/g, '...');
            setTimeout(() => { ttsBox.style.display = 'none'; }, 5000);
        }
    });

    if (logArea) logArea.innerHTML = logLines.length > 0 ? logLines.join('<br>') : "No actions defined for this trigger.";
}
