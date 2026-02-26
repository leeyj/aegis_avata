// --- Studio Alias: Mapping & Management ---

function updateEditor() {
    const editor = document.getElementById('alias-editor');
    if (editor) editor.value = JSON.stringify(window.currentAliasData, null, 4);
}

function startMapping(type, file, el) {
    if (!window.isSponsor) return;
    window.mappingContext = { type, file };
    document.getElementById('mapping-area').style.display = 'block';
    document.getElementById('target-filename').innerText = file.split('/').pop();
    document.getElementById('motion-keys').style.display = (type === 'motion') ? 'block' : 'none';
    document.getElementById('expression-keys').style.display = (type === 'expression') ? 'block' : 'none';
    document.querySelectorAll('.asset-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
}

function cancelMapping() {
    window.mappingContext = null;
    const mappingArea = document.getElementById('mapping-area');
    if (mappingArea) mappingArea.style.display = 'none';
    document.querySelectorAll('.asset-item').forEach(i => i.classList.remove('active'));
}

function mapAsset(key) {
    if (!window.mappingContext) return;
    const targetKey = (window.mappingContext.type === 'motion') ? 'motions' : 'expressions';
    window.currentAliasData[targetKey][key] = window.mappingContext.file;
    updateEditor();
}

async function saveAlias() {
    if (!window.isSponsor) return;
    const name = document.getElementById('model-select').value;
    if (!name) return;

    try {
        const editorValue = document.getElementById('alias-editor').value;
        const data = JSON.parse(editorValue);

        const res = await fetch(`/studio/api/save_alias/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Server returned ${res.status}: ${text.slice(0, 100)}`);
        }

        const result = await res.json();
        alert(result.message || "Saved successfully!");
        window.currentAliasData = data;
    } catch (e) {
        alert("Save failed: " + e.message);
    }
}
