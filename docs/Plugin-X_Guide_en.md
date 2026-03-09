# AEGIS Plugin-X: Extension Module Development Guide (v3.7.0)

---

## ⚡ 0. Performance Architecture: AXC (AEGIS Extreme Cache)
Introduced in v2.4.5, **AXC** maximizes plugin boot speed.
- **IndexedDB**: All plugin assets (HTML/JS/CSS) are permanently stored in the browser's IndexedDB.
- **SHA256 Versioning**: If the server's hash matches, assets are loaded instantly in **under 10ms** without network downloads.
- **Two-Step Hydration**: The DOM structure is created first, followed by parallel asset injection, ensuring both loading speed and layer integrity.

---

## 📌 0. Core Plugin-X Policies (Must Read)

### 0-1. Architecture Direction: Complete Independent Modularity & Deterministic Control
The goal of Plugin-X is for **each plugin to operate as an independent module** physically separated from the main system. Plugins must be expandable or removable simply by adding/deleting a folder, without modifying the core code (`app_factory.py`, `templates/index.html`, `static/js/`, etc.). Since v3.7.0, the priority is to provide **immediate and deterministic reactions (Deterministic Action)** for clear user commands (Command) without AI intervention.

### 0-2. Absolute Prohibitions (⛔ HARD RULES)

| # | Policy | Consequence of Violation |
|---|---|---|
| 1 | Do NOT write plugin logic in **`/static/js/widgets/`** or **`/services/`** | Creates dependency on main system; core breaks when module is removed |
| 2 | Do NOT use generic service filenames like **`service.py`** | Python namespace conflicts causing other plugins to malfunction |
| 3 | Do NOT use short paths without the **`/api/plugins/[id]/`** prefix | Security system (`plugin_security_service`) fails to identify the plugin, bypassing permission checks |
| 4 | Do NOT use absolute path imports like **`import service`** in `router.py` | Global module cache pollution leading to the wrong service being loaded |
| 5 | Do NOT load global objects via **`<script>` tags in `index.html`** | Violates Plugin-X isolation; all logic must reside within `widget.js` |
| 6 | Do NOT reference request/session context outside of `init()` in `widget.js`| Causes `RuntimeError: Working outside of request context` during blueprint discovery |
| 7 | **[v3.7.0]** Do NOT rely solely on AI prompts for fixed commands | AI hallucinations may prevent critical functions (alarms, playback) from executing |

### 0-3. Recommendations (✅ SOFT RULES)

- All inter-plugin communication must pass through the **`context` API** (Capability Proxy).
- If global variables (`window.xxx`) are necessary, register them only inside `init()` and clean up in `destroy()`.
- **[v2.3]** For interactive elements like buttons and checkboxes, call `e.stopPropagation()`. For containers, add `.no-drag`, `.interactive`, or `.clickable` to avoid widget drag interference.
- `config.json` is for internal use; do not directly read other plugins' config files.
- Command handlers should be registered via `context.registerCommand()`. No separate JS files. (v3.7.0+ recommends manifest actions)
- **[v2.4.5] AXC Integrity**: Since assets are managed by hash, if you manually modify assets during development, you must restart the server or clear the browser cache to trigger a hash update.

---

## 🏗️ 1. Standard Plugin Structure

All plugins reside in the `/plugins` directory with a unique folder name.

```text
/plugins/[plugin-id]/
├── __init__.py               # Python package sentinel (Required, empty)
├── manifest.json             # Required (Includes Action definitions)
├── config.json               # Plugin-specific local config (Optional)
├── router.py                 # Required (Blueprint & initialize_plugin)
├── {plugin_id}_service.py    # Required (Naming convention strictly enforced)
└── assets/                   # Frontend assets folder
    ├── widget.html           # HTML snippet (For Shadow DOM injection)
    ├── widget.js             # Logic module (Init/Destroy + Signal handling)
    └── widget.css            # Stylesheet (Shadow DOM isolation)
```

> ⚠️ **Without `__init__.py`, relative imports (`from .xxx_service import ...`) will not work.**

---

## 📜 2. manifest.json Specification (v3.7.0)

`manifest.json` defines identity, **Deterministic Actions**, security permissions (CSP), and backend entry points.

### 🎯 Actions Definition (Deterministic Actions) ✨NEW
Defines fixed commands and actions supported by the plugin. Executed immediately by the system before AI processing.

| Field | Type | Description |
|---|---|---|
| `actions` | array | List of actions the plugin can perform |
| `actions[].id` | string | Unique Action ID (for mapping in `router.py`) |
| `actions[].name` | string | Display name for the action |
| `actions[].commands` | string[] | List of trigger commands (shortcuts, synonyms) |
| `actions[].params` | string[] | List of parameter keys passed with the command |

### Required/Optional Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique Plugin ID (must match folder name) |
| `name` | string | Display name |
| `version` | string | Semantic version |
| `entry.html` | string | Entry HTML path |
| `entry.js` | string | Entry JS module path |
| `entry.css` | string | Entry CSS path |
| `entry.backend` | string | Backend router filename (e.g., `"router.py"`) |
| `permissions` | string[] | System permission list (`api.ai_agent`, `api.voice_service`, etc.) |
| `csp_domains` | object | CSP external domain whitelist (`script-src`, `frame-src`, `img-src`, `connect-src`) |
| `layout.default_size`| string | Initial widget size (`size-1`, `size-1-5`, `size-2`) |
| `hidden` | boolean | If `true`, loads backend only without UI panel |
| `exports` | object | Declares sensors/commands for the Scheduler/External integration |

### Full Example (YouTube Music v3.7.0)

```json
{
    "id": "youtube-music",
    "name": "YouTube Music Player",
    "version": "3.7.0",
    "entry": {
        "html": "assets/widget.html",
        "js": "assets/widget.js",
        "css": "assets/widget.css",
        "backend": "router.py"
    },
    "actions": [
        {
            "id": "play",
            "name": "Play Music",
            "commands": ["play", "재생", "p"],
            "params": ["query"]
        },
        {
            "id": "pause",
            "name": "Pause",
            "commands": ["pause", "정지", "s"]
        }
    ],
    "permissions": ["api.ai_agent", "api.voice_service"],
    "csp_domains": {
        "img-src": ["https://*.ytimg.com"],
        "connect-src": ["https://*.google.com"]
    }
}
```

### Tutorial Example: mp3-player Configuration

A practical `manifest.json` example for developers wondering which files to load or how to request permissions. Sensitive tasks like handling local files or communicating with the AI engine must specify permissions.

```json
{
    "id": "mp3-player",
    "name": "Local Media Hub",
    "version": "1.0.0",
    "author": "AEGIS Core",
    "entry": {
        "html": "assets/widget.html",
        "js": "assets/widget.js",
        "css": "assets/widget.css",
        "backend": "router.py"
    },
    "permissions": [
        "api.media_proxy",
        "api.ai_gateway"
    ],
    "layout": {
        "default_size": "size-1-5"
    }
}
```

**Example Interpretation:**
1. **`entry` field:** 
   Fetches `widget.html` at start, loads `widget.js` for logic and `widget.css` for view. The server registers a separate `/api/plugins/mp3-player/...` route via `router.py`.
2. **`permissions` field:** 
   * `"api.media_proxy"`: Since the plugin must read MP3 files from the system, it requires permission to pass the security proxy.
   * `"api.ai_gateway"`: Required for AI engine communication, such as AI-generated music briefings.
   Failing to declare these while calling restricted APIs in `router.py` will trigger a 403 Forbidden error via the `@require_permission` decorator.
3. **`layout` field:** 
   Sets the default grid width to `size-1-5` (1.5 units) when opened from the sidebar.
4. **Media File Location:**
   * Do not put heavy media files directly inside the plugin folder. 
   * **External Volume Mount:** Use `config.json` to receive absolute paths externally to avoid copying large folders.
   * **`plugins/mp3-player/config.json`:**
     ```json
     { "media_directory": "D:\\MyMusic" }
     ```
   * **Backend Handling:** `router.py` should check `media_directory` and fallback to a default folder (`static/media/mp3/`) if it's missing (Use `utils.load_json_config`).

### `exports.sensors[]` Spec

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✅ | Unique Sensor ID within the plugin |
| `name` | string | ✅ | Display name (e.g., "Indoor Temperature") |
| `unit` | string | ✅ | Unit (e.g., "°C", "%") |
| `type` | string | ✅ | `number`, `string`, `boolean` |
| `endpoint` | string | ✅ | Data API path (Standard `/api/plugins/...`) |
| `field` | string | ✅ | Key to extract data from the JSON response |

### `exports.commands[]` Spec

| Field | Type | Required | Description |
|---|---|---|---|
| `prefix` | string | ✅ | Command prefix (e.g., `/ha`) |
| `name` | string | ✅ | Command description |
| `examples`| string[] | ❌ | Usage examples |

> ⛔ **Failure to declare `exports` will prevent the plugin's data from appearing in the Routine Manager's monitoring.**

---

## ⚖️ 2-2. Special Layout: Fixed HUD (v2.2)

Certain plugins (Terminal, Fullscreen Overlays) should not be dragged or relocated like normal widgets. Use `layout.fixed` in `manifest.json`.

### Configuration
```json
"layout": {
    "fixed": true,
    "zIndex": 10000
}
```

### Key Features & Specs (⛔ MANDATORY)
1. **Fixed Position**: If `fixed: true`, the plugin is **automatically excluded** from `applyUIPositions` (recalculation based on window size). It always stays at (0, 0).
2. **Style Isolation**: The parent container (`fixed-plugin-wrapper`) does not have the global glass/blur effect. Control styles only within the plugin (`widget.css`).
3. **Event Transparency**: The wrapper's pointer-events are `none`. Explicitly set `pointer-events: auto` only for interactive elements (Inputs, Buttons).

---

## 🧩 3. Frontend: Runtime Environment (Capability Proxy)

When a plugin loads, `init(shadowRoot, context)` is called. Access system resources ONLY via the **`context` object**.

### Context API List

| API | Description |
|---|---|
| `context.log(msg)` | Console log with automatic tagging |
| `context._t(key)` | i18n translation |
| `context.applyI18n()` | Re-translates Shadow DOM elements |
| `context.askAI(task, data)` | AI Gateway request (Returns standard response) |
| `context.speak(display, briefing, visualType)` | Unified TTS utterance (Skips audio if `--m` flag is present) |
| `context.appendLog(tag, msg)` | Terminal log output |
| `context.registerCommand(p, cb)` | Registers terminal command |
| `context.registerTtsIcon(t, i)` | Registers TTS icons |
| `context.triggerReaction(t, d, to)`| Triggers avatar reaction |
| `context.triggerBriefing(el, opt)` | **[v2.3]** Tactical briefing. Automatically applies Proactive-Agent filters. |
| `context.registerSchedule(n, t, cb)`| Registers global tick scheduler |
| `context.playMotion(filename)` | Plays Live2D motion (Supports path or Alias) |
| `context.changeModel(name)` | Switches Live2D model |
| `context.getMediaList()` | Media proxy list |
| `context.getAudioUrl(file)` | Media streaming URL |
| `context.environment.applyEffect(t)`| Triggers RAINY, SNOWY, STORM, CLEAR |

### 💡 Extension via Custom Alias
AEGIS supports unlimited **Custom Aliases** defined by users or developers, beyond standard ones like `idle` or `joy`.
* Users can map motions to names like `superhappy` via the Studio UI.
* Developers can call these aliases directly in `widget.js` without core modification.
  ```javascript
  context.triggerReaction('MOTION', { alias: 'superhappy' });
  ```

### widget.js Standard Core

```javascript
export default {
    updateTimer: null,
    config: {},

    init: async function (shadowRoot, context) {
        context.log("Widget Initializing...");

        // 1. Load config
        try {
            const res = await fetch('/api/plugins/[plugin-id]/config');
            const data = await res.json();
            Object.assign(this.config, data);
        } catch (e) { }

        // 2. HUD Real-time Sync (sync_cmd) ✨NEW
        window.addEventListener('sync_cmd', (e) => {
            if (e.detail.command === 'refresh_data') this.refresh();
        });

        // 3. Initial Load
        const refresh = async () => { /* Logic */ };
        this.refresh = refresh;
        await refresh();

        // 4. Global Exposure (Only if needed, inside init)
        window.refreshMyWidget = refresh;

        // 5. Periodic Refresh
        this.updateTimer = setInterval(refresh, this.config.polling_interval_ms || 300000);
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
    }
};
```

### 3-6. Widget Lifecycle & DOM Constraints
1. **Injection**: `widget.html` is fetched and inserted via `innerHTML`.
   - ⛔ **Warning**: `<script>` tags inside `widget.html` will **NOT be executed**. Write all logic in `widget.js`.
2. **Initialization**: `init()` is called once after injection. Start fetching data and `setInterval` here.
3. **Destruction**: `destroy()` is called when the widget is closed. Clear timers and listeners to avoid **Memory Leaks**.

---

## ⚡ 3.5. Boot Optimization: AXC & Parallel Hydration (v2.4.5) ✨NEW

The system uses the following pipeline to launch 20+ plugins instantly:
1. **Synchronous Wrapper Creation**: DOM wrappers are created first to ensure priority order.
2. **Parallel Hydration**: Loading assets and executing `init()` are performed concurrently via `Promise.all`.
3. **Blob URL Isolation**: Bundled JS executes instantly in-memory via `URL.createObjectURL(blob)`, providing 0 network latency.

---

## 🛠️ 4. Backend: Router & Service Standards (v3.7.0)

### 4-1. Deterministic Action Registration Pattern (⛔ MANDATORY) ✨NEW
Every `router.py` must register its action handlers at startup.

```python
from services.plugin_registry import register_plugin_action

# [v3.7.0] Initialization function
def initialize_plugin():
    # Register handler matching the Action ID in manifest.json
    register_plugin_action("my-plugin-id", "play", handle_play)
    
def handle_play(params, target_id=None):
    # params: String after the command
    result = MyService.play(params)
    return {
        "text": f"Processed successfully: {result}",
        "sync_cmd": "refresh_data" # Optional UI sync trigger
    }
```

### 4-2. File Naming Rules (⛔ MANDATORY)

```text
✅ Correct Examples              ❌ Wrong Examples
─────────────────────────────    ─────────────────────────
notion_service.py               service.py
weather_service.py              weather.py (Ambiguous)
stock_service.py                data_fetcher.py (Non-standard)
```
**Rule: `{plugin_id_with_underscores}_service.py`**

### 4-4. Import Standards & Utilities (⛔ MANDATORY)
Use standard `utils.py` instead of direct `json.load`.

```python
# ✅ Correct Imports
from .notion_service import NotionService  # Relative import
from utils import load_json_config, save_json_config  # System utilities
from services.plugin_registry import register_context_provider # Registry
```

### 4-5. router.py Standard Skeleton

```python
import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from .{plugin_id}_service import MyService    # Relative
from utils import load_json_config
from services.plugin_registry import register_context_provider, register_plugin_action

def initialize_plugin():
    register_plugin_action("{id}", "action_id", my_handler)
    register_context_provider("{id}", get_my_context)

@login_required
def get_my_context():
    return MyService.get_data()

def my_handler(params, target_id=None):
    result = MyService.do_action(params)
    return {"text": "Done", "sync_cmd": "refresh"}
```

---

## 🛡️ 5. Security & Design Guide

### 5-1. CSS Isolation (Shadow DOM Boundary)
Styles are encapsulated. Use standard CSS variables (`--neon`, `--glass`) to maintain the tone.

### 5-2. CSP (Content Security Policy)
Register domains in `csp_domains` of `manifest.json`. **Unregistered domains will be blocked immediately by the browser.**

---

## 🔄 8. Version History

| Version | Date | Key Changes |
|---|---|---|
| v2.4.5 | 2026-03-04 | **AXC (Extreme Cache)** & Parallel Loading |
| v3.4.0 | 2026-03-07 | **Global I18n & BotManager** |
| v3.7.0 | 2026-03-08 | **Deterministic Actions** & **HUD Sync (sync_cmd)** |

---

## ⌨️ 9. Unified Command System & Priority (v3.7.0)
1. **System Core**: `/config`, `/help`, etc.
2. **Deterministic Actions**: Defined in `manifest.json` (No AI intervention).
3. **Hybrid Context (@)**: Widget data + External search.
4. **Local Context (/)**: Local summary report.
5. **AI Fallback**: General conversation.

---
**AEGIS Plugin-X Standard v3.7.0 Documentation**
*Official Architecture Agreement between developers and AI agents.*
