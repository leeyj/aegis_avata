// --- Studio Alias: Mapping & Management ---

function updateEditor() {
    const editor = document.getElementById('alias-editor');
    if (editor) editor.value = JSON.stringify(window.currentAliasData, null, 4);
}

function startMapping(type, file, el) {
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

function mapCustomAsset() {
    const input = document.getElementById('custom-alias-input');
    const customKey = input ? input.value.trim() : '';
    if (!customKey) {
        alert("Please enter a custom alias name.");
        return;
    }
    // Prevent overriding reserved words or numbers if needed, but we allow anything for power users.
    mapAsset(customKey);
    if (input) input.value = ''; // clear upon success
}

async function saveAlias() {
    const name = document.getElementById('model-select').value;
    if (!name) return;

    try {
        const editorValue = document.getElementById('alias-editor').value;
        const data = JSON.parse(editorValue);

        const res = await fetch(`/api/plugins/studio/save_alias/${name}`, {
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
