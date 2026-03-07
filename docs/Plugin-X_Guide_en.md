# AEGIS Plugin-X: Extension Module Development Guide (v3.4.0)

---

## ⚡ 0. Performance Architecture: AXC (AEGIS Extreme Cache)
Introduced in v2.4.5, **AXC** maximizes plugin boot speed.
- **IndexedDB**: All plugin assets (HTML/JS/CSS) are permanently stored in the browser's IndexedDB.
- **SHA256 Versioning**: If the hash matches the server's, the plugin loads instantly in **under 10ms** without network download.
- **Two-Step Hydration**: Creates DOM structure first, then injects assets in parallel to ensure both speed and layer consistency.

---

## 📌 0. Plugin-X Core Policies (Must Read)

### 0-1. Architectural Vision: Complete Independent Modularity
The goal of Plugin-X is for each plugin to operate as an independent module physically separated from the main system. Plugins must be able to extend or remove features simply by adding or deleting folders, without modifying the core system files (e.g., `app_factory.py`, `index.html`, `static/js/`).

### 0-2. Hard Rules (⛔ DO NOT VIOLATE)

| # | Policy | Problem Caused by Violation |
|---|---|---|
| 1 | Do not write plugin logic in **`/static/js/widgets/`** or **`/services/`**. | Creates dependencies on the main system, breaking core functionality when the module is removed. |
| 2 | Do not name your service file **`service.py`** (generic name). | Python namespace conflicts causing other plugins to malfunction. |
| 3 | Do not use short route paths without the **`/api/plugins/[id]/`** prefix. | The security system (`plugin_security_service`) fails to identify the plugin and bypasses permission checks. |
| 4 | Do not use absolute imports like **`import service`** in `router.py`. | Global module cache pollution causing the wrong service to load. |
| 5 | Do not load global objects via **`<script>` tags in `index.html`**. | Violates Plugin-X isolation. All logic must be self-contained in `widget.js`. |
| 6 | Do not reference context-dependent objects like **Flask `request`/`session`** outside of `init()` in `widget.js`. | Causes `RuntimeError: Working outside of request context` during blueprint discovery at app startup. |

### 0-3. Soft Rules (✅ RECOMMENDATIONS)

- Mediate all inter-plugin communication through the **`context` API** (Capability Proxy).
- If global variables (`window.xxx`) are necessary, register them only inside `init()` and clear them in `destroy()`.
- **[v2.3]** Always apply `e.stopPropagation()` to clickable elements like buttons or checkboxes. If a container is clickable, include one of `.no-drag`, `.interactive`, or `.clickable` in its class to avoid interference with widget move events.
- `config.json` should only be referenced within the plugin; do not read other plugins' configuration files directly.
- Register terminal command handlers via `context.registerCommand()` within `widget.js`; do not create separate external JS files.
- **[v2.4.5] AXC Integrity**: Since assets are managed by hashes, if you manually modify assets during development, restart the server or clear the browser cache to trigger a hash update.

---

## 🏗️ 1. Standard Plugin Structure

All plugins reside in the `/plugins` directory with a unique folder name. Features can be added or removed simply by adding or deleting folders without modifying system code.

```text
/plugins/[plugin-id]/
├── __init__.py               # Python package soul (Required, empty file)
├── manifest.json             # Metadata, permissions, CSP declaration (Required)
├── config.json               # Plugin-specific local settings (Optional)
├── router.py                 # Flask Blueprint (Backend, Optional)
├── {plugin_id}_service.py    # Business logic (Optional, Naming convention required)
└── assets/                   # Frontend assets folder
    ├── widget.html           # HTML snippet (for Shadow DOM injection)
    ├── widget.js             # Logic execution module (Init/Destroy + Command handlers)
    └── widget.css            # Style sheet (Shadow DOM isolation)
```

> ⚠️ **Relative imports (`from .xxx_service import ...`) will not work without `__init__.py`.**

---

## 📜 2. manifest.json Specification (v1.7)

`manifest.json` is the most critical file defining the plugin's identity, **Security Permissions (CSP)**, and backend entry points.

### Mandatory Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique plugin ID (must match the folder name) |
| `name` | string | Plugin name displayed to the user |
| `version` | string | Semantic versioning |
| `entry.html` | string | Path to widget HTML file |
| `entry.js` | string | Path to widget JS module |

### Optional Fields

| Field | Type | Description |
|---|---|---|
| `entry.css` | string | Path to widget CSS file |
| `entry.backend` | string | Backend router filename (e.g., `"router.py"`) |
| `permissions` | string[] | System permission list (`api.ai_agent`, `api.voice_service`, etc.) |
| `csp_domains` | object | List of external domains for CSP (`script-src`, `frame-src`, `img-src`, `connect-src`) |
| `layout.default_size` | string | Default widget size (`size-1`, `size-1-5`, `size-2`) |
| `hidden` | boolean | If `true`, loads backend only without UI panel |
| `exports` | object | Public data points for scheduler/external integration |
| `exports.sensors` | array | List of monitorable data points |
| `exports.commands` | array | List of available terminal commands |

### Full Example (IoT Widget with exports)

```json
{
    "id": "home-assist",
    "name": "Home Assist Thermometer",
    "version": "1.0.0",
    "entry": {
        "html": "assets/widget.html",
        "js": "assets/widget.js",
        "backend": "router.py"
    },
    "exports": {
        "sensors": [
            {
                "id": "indoor_temp",
                "name": "Indoor Temperature",
                "unit": "°C",
                "type": "number",
                "endpoint": "/api/plugins/home-assist/temperature",
                "field": "temp"
            },
            {
                "id": "humidity",
                "name": "Indoor Humidity",
                "unit": "%",
                "type": "number",
                "endpoint": "/api/plugins/home-assist/humidity",
                "field": "humidity"
            }
        ],
        "commands": [
            { "prefix": "/ha", "name": "Home Assist Control", "examples": ["/ha status", "/ha fan on"] }
        ]
    }
}
```

---

## ⚖️ 2-2. Special Layout: Fixed HUD (v2.2)

Certain plugins (e.g., terminal, full-screen overlay) should not be dragged or recalculated based on aspect ratios like normal widgets. For this purpose, `manifest.json` supports the `layout.fixed` property.

### Configuration
```json
"layout": {
    "fixed": true,
    "zIndex": 10000
}
```

### Key Features and Specs (⛔ Mandatory)
1. **Pinned Position**: When `fixed: true` is set, the plugin is **automatically excluded** from global `applyUIPositions` (position recalculation on window resize). It remains at (0, 0) by default.
2. **Style Isolation**: The parent container (`fixed-plugin-wrapper`) does not have the global glass/blur effect. Control styles only within the plugin (`widget.css`) to minimize interference with system layout.
3. **Event Passthrough**: Fixed plugin wrappers are `pointer-events: none` by default. You must individually grant `pointer-events: auto` to internal interactive elements (input bars, buttons).

---

## 🧩 3. Frontend: Runtime Environment (Capability Proxy)

When a plugin is loaded, the `init(shadowRoot, context)` function is called. System resources must be accessed **only through the `context` object**.

### Context API List

| API | Description |
|---|---|
| `context.log(msg)` | Console log (automatically tagged with plugin ID) |
| `context._t(key)` | i18n translation |
| `context.applyI18n()` | Re-translates inside Shadow DOM |
| `context.askAI(task, data)` | AI Gateway request (returns standard display/briefing response) |
| `context.speak(display, briefing, visualType)` | Unified TTS output (Note: voice is skipped if `--m` flag is detected) |
| `context.appendLog(tag, message)` | Prints log to terminal window |
| `context.registerCommand(prefix, callback)` | Registers a terminal command |
| `context.registerTtsIcon(type, icon)` | Registers a TTS icon |
| `context.triggerReaction(type, data, timeout)` | Triggers avatar reaction |
| `context.triggerBriefing(feedbackEl, options)` | **[v2.3]** Executes tactical briefing (automatically applies Proactive-Agent filters) |
| `context.registerSchedule(name, type, callback)` | Registers global tick scheduler |
| `context.playMotion(filename)` | Plays Live2D motion (supports path or Alias) |
| `context.changeModel(modelName)` | Switches Live2D model |
| `context.getMediaList()` | Lists media proxy files |
| `context.getAudioUrl(filename)` | Returns media streaming URL |
| `context.environment.applyEffect(type)` | Triggers global environmental effects (RAINY, SNOWY, STORM, CLEAR) |

### 💡 Extension via Custom Aliases
AEGIS supports not only default motion names like `idle` or `joy` but also **unlimited Custom Aliases** defined by users or developers.
* Users can create names like `superhappy` or `grey_face` in the Studio UI and map motions to them.
* Developers can call these **user-defined Custom Aliases** directly within `widget.js` without modifying main code.
  ```javascript
  // If the user has created a 'superhappy' alias, the avatar performs it immediately
  context.triggerReaction('MOTION', { alias: 'superhappy' });
  ```

### widget.js Standard Core

```javascript
export default {
    updateTimer: null,
    config: {},

    init: async function (shadowRoot, context) {
        context.log("Widget Initializing...");

        // 1. Load configuration
        try {
            const res = await fetch('/api/plugins/[plugin-id]/config');
            const data = await res.json();
            Object.assign(this.config, data);
        } catch (e) { }

        // 2. Load data & Render
        const refresh = async () => { /* ... */ };
        await refresh();

        // 3. Global exposure (if needed, only inside init)
        window.refreshMyWidget = refresh;

        // 4. Register command (Essential for terminal alias integration)
        context.registerCommand('/[plugin-id]', (cmd) => this.refresh());
        context.registerCommand('/mycmd', (cmd) => this.handleMyCommand(cmd));

        // 5. Periodic update
        this.updateTimer = setInterval(refresh, this.config.polling_interval_ms || 300000);
    },

    // Handlers must be defined within the same object
    async handleMyCommand(command) {
        // ...
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
    }
};
```

### 3-6. Widget Lifecycle and DOM Restrictions
The system mounts and destroys widgets in an isolated state. Please follow these rules:

1. **Injection**: The system fetches `assets/widget.html` and inserts it via `shadowRoot.innerHTML`.
   - ⛔ **Warning**: Since it is inserted as `innerHTML`, **`<script>` tags inside `widget.html` will NOT be executed by the browser.** All logic must be in `widget.js`.
   - ⛔ **Warning**: Plugins cannot use the `<slot>` API; limit all DOM manipulation to `shadowRoot.querySelector()`.
2. **Initialization**: After HTML injection, `widget.js`'s `init(shadowRoot, context)` is called exactly once. Start fetching data and `setInterval` here.
3. **Destruction**: When the user closes the widget or refreshes the dashboard, `destroy()` is called. Clear polling timers and event listeners here to prevent **Memory Leaks**.

---

## ⚡ 3.5. Boot Optimization: AXC & Parallel Hydration (v2.4.5) ✨NEW
The system uses the following pipeline to launch 20+ plugins instantly:
1. **Synchronous Wrapper Creation**: Creates all plugin wrappers in DOM first to guarantee priority.
2. **Parallel Hydration**: Asset loading and `init()` execution are performed simultaneously via `Promise.all`.
3. **Blob URL Isolation**: Bundled JS runs instantly from memory via `URL.createObjectURL(blob)`, zero network latency.

---

## 🛠️ 4. Backend: Router and Service Standards (v1.7)

### 4-1. Naming Conventions (⛔ Do Not Violate)

```text
✅ Correct Examples              ❌ Incorrect Examples
─────────────────────────────    ─────────────────────────
notion_service.py               service.py
weather_service.py              weather.py (vague)
stock_service.py                data_fetcher.py (non-standard)
```
**Rule: `{plugin_id with hyphens changed to underscores}_service.py`**

### 4-2. Route Path Rules (⛔ Do Not Violate)

All backend API endpoints must follow this pattern:
```
/api/plugins/{plugin-id}/{action}
```
**Reason**: `plugin_security_service.py` extracts the plugin ID from the 3rd segment of the URL. Bypassing this pattern disables **Security Permission Checks**.

### 4-3. Import Standards and Utilities (⛔ Do Not Violate)

Plugins must use the parent `utils.py` module for file I/O instead of direct `json.load` for stability.

```python
# ✅ Correct Imports
from .notion_service import NotionService  # Relative path
from utils import load_json_config, save_json_config  # System utilities
from services.plugin_registry import register_context_provider # Briefing engine registration
```

#### 🛠️ Standard Utility APIs (`utils.py`)
| Function | Parameters | Return | Features |
|---|---|---|---|
| `load_json_config(path)` | `path` (str) | `dict` | Returns `{}` if file is missing, auto-handles `utf-8-sig`. |
| `save_json_config(path, data, merge=True)` | `path`, `data`, `merge` | `bool` | Atomic Write. Preserves existing data if `merge=True`. |
| `clean_ai_text(text)` | `text` (str) | `str` | Removes markdown wrappers (```json) and unnecessary tags from AI response. |

### 4-4. router.py Standard Core

```python
import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from .{plugin_id}_service import MyService    # Relative import
from utils import load_json_config
from services import require_permission
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

my_plugin_bp = Blueprint("{plugin_id}_plugin", __name__)

# 0. Context Provider Registration (Briefing Engine)
def get_my_context():
    return MyService.get_data()

register_context_provider("{plugin-id}", get_my_context)

# 1. Config Retrieval
@my_plugin_bp.route("/api/plugins/{plugin-id}/config")
@login_required
def get_config():
    return jsonify(load_json_config(CONFIG_PATH))

# 2. Data Retrieval
@my_plugin_bp.route("/api/plugins/{plugin-id}/data")
@login_required
@require_permission("api.{permission}")
def get_data():
    return jsonify(MyService.get_data())
```

### 4-5. Context Provider & Multi-Alias Engine (v2.7+) ✨NEW
`register_context_provider('my-plugin', get_my_plugin_context, aliases=['Schedule', 'Routine'])`
* Backend aliases are synced to the frontend `CommandRouter` at startup.
* Entering `/Schedule` in the terminal will be routed to `/my-plugin`.

---

## 🤖 5. AI Response Standardization & Prompt Policy (v3.0+)

### 5-1. De-hardcoding Prompts
Do not hardcode AI agent names ("AEGIS") or response labels ("Response:") inside prompts. Instructions are injected dynamically via `get_i18n()` based on the user's `lang` setting.

### 5-2. Clean Response Standards
Even if the AI includes markdown wrappers (```json), the system automatically removes them via `utils.clean_ai_text()`. Developers receive cleaned data. Note: instructions for `briefing` fields for TTS must strictly forbid markdown symbols.

1. **No Cross-plugin Interference**: A plugin must NEVER `import` Python files from another plugin. All communication must happen via `fetch()` or `context`.
2. **Explicit Relative Imports**: Avoid absolute imports in backend scripts.
3. **Global Namespace Safety**: Global variables at the module level are shared across all instances. Be careful not to overwrite request-specific data.

---

## 🛡️ 5. Security and Design Guide

### 5-1. CSS Isolation (Shadow DOM Boundary)
Styles are encapsulated within the Shadow DOM and do not pollute the main page. Use system standard CSS variables (`--neon`, `--glass`, `--bg-dark`) to maintain design consistency.

### 5-2. CSP (Content Security Policy)
Register external domains in `manifest.json > csp_domains`. Unregistered domains will be blocked immediately by the browser.

### 5-3. Resource Cleanup (Memory Leak Prevention)
Always clear `setInterval`, `setTimeout`, and event listeners in the `destroy()` function.

### 5-5. Backend Service Connection Lifecycle
Plugins maintaining long-term connections (IMAP, WebSocket) must include keepalive/reconnect logic. (See `FRAMEWORK_REFERENCE §3-6`)

### 5-6. Email Protocol Clarification (SMTP vs IMAP)
- **Receiving/Reading**: `IMAP` (`imaplib.IMAP4_SSL`)
- **Sending**: `SMTP` (`smtplib.SMTP_SSL`)

---

## 🛠️ 6. Config Management Interface ✨NEW
Plugins with `config.json` are encouraged to implement the following standard POST endpoint to allow GUI-based configuration changes.

```python
@plugin_bp.route("/api/plugins/{id}/config", methods=["GET", "POST"])
@login_required
@standardized_plugin_response
def handle_config():
    if request.method == "POST":
        data = request.json
        current = load_json_config(CONFIG_PATH)
        current.update(data)
        save_json_config(CONFIG_PATH, current)
        return jsonify({"status": "success", "config": current})
    return jsonify(load_json_config(CONFIG_PATH))
```

---

## 💅 7. Premium Design Guide (Aesthetics) ✨NEW
AEGIS widgets should provide a "WOW" visual experience.
1. **Typography**: Use `Google Fonts (Inter, Outfit, Roboto)` instead of default fonts.
2. **Glassmorphism**: Combine `backdrop-filter: blur(12px)` with semi-transparent backgrounds for depth.
3. **Micro-animations**: Use smooth `transition` and `pulse` effects for button hovers or state changes.
4. **Color Palette**: Use harmonious HSL colors or system neon colors (`--neon-blue`) instead of raw primary colors.

---

## 📐 6. Loader Mechanism (Reference)
`discover_plugin_blueprints()` in `routes/plugins.py` handles automatic loading at startup:
1. Scans all folders under `/plugins/`.
2. Checks `entry.backend` in `manifest.json`.
3. Performs isolated module loading.
4. Searches for `Blueprint` objects via `isinstance` check.
5. Registers found Blueprints to the Flask app.

---

## ⏰ 7. Scheduler Integration: Universal Routine Registration (v1.7.1)
The scheduler handles time-based automation. Plugins reserve features simply by adding routines to `config.json`.

### 7-2. `terminal_command` — Reserved Execution
Any command registered in `CommandRouter` can be scheduled.
```json
{
    "id": "notion_daily_cleanup",
    "action": "terminal_command",
    "command": "/ns clean"
}
```

### 7-3. `api_call` — Direct Backend Call
Used when bypassing the terminal UI to call a backend API directly.

---

## 🧬 7-5. Conditional Watch Routine (v1.8+)
Routines triggered by **data conditions** rather than just time.
* API polling via `condition.source`.
* Type conversion (`number`, `string`, `boolean`) based on `exports.sensors`.
* Comparison via `condition.operator`.
* **Action Sync**: Executes `action` when conditions are met.

---

## 🔄 8. Version History

| Version | Date | Key Changes |
|---|---|---|
| v1.6 | 2026-02-28 | Introduced Plugin-X architecture, Frontend isolation |
| v1.7 | 2026-03-02 | Enforced route standards, Namespace isolation |
| v1.8 | 2026-03-02 | **`exports` manifest spec**, Condition Watch implementation |
| v2.0 | 2026-03-03 | Agent Tool architecture, Google Search tool integration |
| v2.4.5 | 2026-03-04 | **AXC (AEGIS Extreme Cache)**, Parallel Hydration |
| **v3.4.0** | 2026-03-07 | **Global I18n & BotManager** introduction. Unified Command routing (/@, /, /#) and Discord adapter standardization. |

---

## 🤖 8. AI Response Standardization (v2.1)

### 8-1. Standard Field Definitions
| Field | Purpose | Features |
|---|---|---|
| **`display`** | Visual Output | Full response (Markdown/Rich text). Printed to terminal. |
| **`briefing`** | Voice/Tooltip | Pure text for TTS. No Markdown. Spoken sentences. |
| `sentiment` | Avatar Reaction | Emotion keywords (`happy`, `neutral`, `serious`, `alert`). |
| `visual_type` | Visual Hint | HUD icon type (`weather`, `finance`, `calendar`, etc.). |

### 8-2. Action Synchronization (Action Sync) ✨NEW
If the AI response contains reserved tags like **`[ACTION] SET_ALARM`**, `BotManager` interprets it and instantly triggers the registered plugin handler or system action.

---

## ⌨️ 9. Unified Command routing (v3.4) ✨NEW

Starting from v3.4.0, all messaging interfaces (Web, Discord) follow the same command system.

---

## ⚠️ 10. Common Errors and Solutions (Troubleshooting)

### 10-1. Widget Moves when Clicking Interactive Elements
AEGIS widgets are draggable. To prevent moving when clicking buttons/inputs:
1. Call `e.stopPropagation()` and `e.preventDefault()` in `mousedown` and `click` handlers.
2. Add class **`.no-drag`**, **`.interactive`**, or **`.clickable`** to the container.

---

## 🧠 11. Messaging Hub Integration (BotManager) ✨NEW

To extend the system to support new messaging channels (Telegram, Slack, etc.), follow the `BotAdapter` spec.
1. **BotManager**: Central brain interpreting intents and gathering plugin data.
2. **I18n Prompt**: AI persona and guidelines are managed via `config/i18n/` JSON files. Use `utils.get_i18n(key, lang)` on the backend.
3. **Cross-Platform Sync**: Dashboard changes can be synced to all connected bot adapters.

---
**AEGIS Plugin-X Standard v3.4.0 Documentation**
