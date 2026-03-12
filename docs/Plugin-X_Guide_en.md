# AEGIS Plugin-X: Extension Module Development Guide (v4.0.0)

This document contains all specifications and guidelines for **Plugin-X**, the official framework for developing extension features for the AEGIS dashboard system. In v4.0.0, **Iframe-based physical isolation** and **AXC (AEGIS Extreme Cache)** for ultra-fast loading have been applied, and all plugin development must 100% comply with the specifications and philosophy of this document.

> [!IMPORTANT]
> **"A feature not in the documentation is a feature that does not exist."**
> AEGIS aims for extreme modularity and predictability. Implementations that deviate from the patterns and specifications described in this guide are not supported, and any missing fields or specifications must be reported and reflected immediately. This document is the final version that integrates all technical details from previous versions and is updated with the v4.0.0 architecture.

---

## ⚡ 0. v4.0 Architecture Core: Iframe Isolation & AXC

Since v4.0, AEGIS has completely overhauled its architecture for stronger security and performance.

- **Iframe Isolation (v4.0 Core)**: Every widget runs within an independent Iframe. This physically resolves the limitations of legacy Shadow DOM (Global CSS variable pollution, JS global object collisions, etc.) to ensure a perfect security distance.
- **AXC (AEGIS Extreme Cache)**: All plugin assets (HTML/JS/CSS) are version-managed with SHA256 hashes in the browser's IndexedDB and are loaded instantly in **less than 10ms** without network downloads.
- **Parallel Hydration**: The DOM structure is created first, and then asset loading and `init()` processing are injected in parallel, ensuring both loading speed and layer consistency. (The final form of the optimization pipeline introduced in v2.4.5)
- **ES Modules & Dynamic Loading**: Supports `import/export`, and widget logic can be separated into `api.js`, `renderer.js`, etc., and managed efficiently via `context.resolve()`.

---

## 📌 0. Plugin-X Core Policies (Must be Mastered)

### 0-1. Architectural Direction: Full Independent Modularity & Deterministic Control
The goal of Plugin-X is for **each plugin to operate as an independent module physically separated from the main system**. Plugins must be able to extend or remove features simply by adding or deleting folders, without modifying the core code (`app_factory.py`, `gods.py`, `index.html`, etc.).

Furthermore, according to the **Determinism First** principle, registered handlers must react immediately to clear user commands without going through AI judgment. (A core principle since v3.7.0)

### 0-2. Absolute Prohibitions (⛔ HARD RULES)

| # | Policy | Issues if Violated |
|---|---|---|
| 1 | Do not write plugin logic in **`/static/js/widgets/`** or **`/services/`**. | Dependencies on the main system occur, causing the core to break when the module is removed. |
| 2 | Do not name service files **`service.py`** (generic name). | Python namespace collisions cause other plugins to malfunction. |
| 3 | Do not use short paths in route paths without the **`/api/plugins/[id]/`** prefix. | The security system (`plugin_security_service`) cannot identify the plugin, bypassing authority checks. |
| 4 | Do not use absolute path imports like **`import service`** in `router.py`. | Global module cache pollution causes the wrong service to be loaded. |
| 5 | **[v4.0]** Do not write `<script>` tags inside `widget.html`. | Internal scripts do not execute due to the nature of Iframe injection. All logic must be written in `widget.js`. |
| 6 | Do not refer to context-dependent objects like Flask **`request` / `session`** outside of `init()` in `widget.js`. | A `RuntimeError: Working outside of request context` occurs during the blueprint discovery process at app startup. |
| 7 | Do not rely solely on AI prompts to process fixed commands. | AI hallucinations may prevent important features (alarms, playback, etc.) from executing. |

### 0-3. Recommendations (✅ SOFT RULES)

- Communication between plugins must go through the **`context` API** (Capability Proxy).
- **Event Delegation**: Instead of attaching `onclick` to individual elements, use `root.addEventListener('click', ...)` combined with `data-action` attributes.
- **ES Module Separation**: If widget logic becomes long, separate it into `assets/api.js`, `assets/ui.js`, etc., and import using `context.resolve()`.
- Buttons, checkboxes, and other clickable elements must apply **`e.stopPropagation()`**, and if a container is clickable, include one of `.no-drag`, `.interactive`, or `.clickable` in the class to block interference with widget drag (Move) events.
- `config.json` is only referenced internally within the plugin; do not directly read other plugins' configuration files.

---

## 🏗️ 1. Plugin Standard Structure

All plugins have a unique folder name under the `/plugins` directory and can extend features just by adding a folder without modifying system code.

```text
/plugins/[plugin-id]/
├── __init__.py               # Python package declaration (Required, empty file)
├── manifest.json             # Required (Defines Actions and permissions)
├── config.json               # Plugin-specific local configuration (Optional)
├── router.py                 # Required (Blueprint & initialize_plugin included)
├── {plugin_id}_service.py    # Required (Naming convention mandatory)
└── assets/                   # Frontend assets folder
    ├── widget.html           # HTML fragment (For Iframe injection)
    ├── widget.js             # Logic execution module (Init/Destroy)
    ├── widget.css            # Style sheet (Isolated)
    ├── api.js                # [Recommended] Module for backend communication (ES Module)
    └── renderer.js           # [Recommended] Module for UI rendering (ES Module)
```

---

## 📜 2. manifest.json Detailed Specification (Exhaustive Audit Results for v4.0.0)

`manifest.json` defines the plugin's identity, security permissions, layout, and external integration specifications.

### 2-1. Top-Level Field List

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✅ | Unique plugin ID (Must be identical to the folder name) |
| `name` | string | ✅ | Plugin name displayed to the user |
| `version` | string | ✅ | Semantic version (e.g., `"4.0.0"`) |
| `author` | string | ❌ | Plugin creator |
| `description` | string | ❌ | Detailed description of the plugin |
| `icon` | string | ✅ | Icon to be displayed (Emoji or icon class) |
| `priority` | number | ❌ | Loading priority (the lower, the earlier. Default is 100) |
| `complexity` | number | ❌ | Function complexity index (0~3) |
| `hybrid_level` | number | ✅ | **[v4.0]** Isolation level (1: System, 2: Standard Iframe, 3: Hybrid) |
| `hidden` | boolean | ❌ | If `true`, hidden from the UI dashboard and only backend services operate |
| `entry` | object | ✅ | Entry point file path definitions (`html`, `js`, `css`, `backend`) |
| `permissions` | string[] | ❌ | List of required system API permissions (`api.ai_gateway`, `api.media_proxy`, etc.) |
| `csp_domains` | object | ❌ | Allowed domains for external resources (`img-src`, `connect-src`, etc.) |
| `layout` | object | ❌ | Widget placement and size specifications |
| `exports` | object | ❌ | Integration specs with other plugins (scheduler, etc.) |
| `actions` | array | ❌ | Definition of deterministic commands and AI integration actions |

### 2-2. `entry` Object Details
- `html`: Widget structure file (e.g., `"assets/widget.html"`)
- `js`: Execution logic file (e.g., `"assets/widget.js"`)
- `css`: Style sheet file (e.g., `"assets/widget.css"`)
- `backend`: Python router file (e.g., `"router.py"`)

### 2-3. `layout` Object Details (Including v2.2 fixed widget spec)
- `default_size`: Default widget size (`"size-1"`, `"size-1-5"`, `"size-2"`)
- **`fixed`**: If `true`, widget movement is blocked and it is excluded from global position recalculation, fixed to a specific position (e.g., 0, 0) (For HUD styles only).
- **`zIndex`**: Specifies the layer order for fixed widgets (Higher numbers mean on top).

### 2-4. `actions` (Deterministic Actions) Specification ✨NEW (v3.7.0+)
Defines actions to be executed immediately upon clear user commands without AI judgment.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique Action ID (For handler mapping in router.py) |
| `name` | string | Action name displayed to the user |
| `commands` | string[] | List of trigger commands (e.g., `["play", "p"]`) |
| `params` | string[] | List of parameter keys to be passed with the command (e.g., `["query"]`) |

---

## 🎯 3. `exports` Integration Specification (Inter-plugin Discovery)

The `exports` section allows the routine manager (scheduler) to automatically discover and utilize the plugin's data and functions.

### 3-1. `exports.sensors[]` (Status Monitoring and Condition Triggers)
Sensors expose data to be used as 'conditions' for routines.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique sensor ID (Unique within the plugin) |
| `name` | string | Name for the user (e.g., "Indoor Temperature", "Currently Playing") |
| `unit` | string | Unit display (e.g., "°C", "%", "boolean", "text") |
| `type` | string | Data type (`number`, `string`, `boolean`) |
| `endpoint` | string | API path to query data (e.g., `"/api/plugins/weather/data"`) |
| `field` | string | Path to extract the value from the API response JSON (Supports dot notation, e.g., `"status.temp"`) |

### 3-2. `exports.commands[]` (Terminal Command Guide)
Provides a terminal command guide for users and AI.

| Field | Type | Description |
|---|---|---|
| `prefix` | string | Command prefix (e.g., `"/yt"`, `"/ns"`) |
| `name` | string | Command name/description |
| `examples` | string[] | List of actual usage examples |

### 3-3. `exports.actions[]` (Automation Action Execution) ✨NEW
Exposes deterministic actions to be used as 'actions' for routines.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique Action ID |
| `name` | string | Action name for the user (e.g., "Pause Music", "News Briefing") |
| `description` | string | Detailed description of the action |
| `type` | string | Execution method (`"terminal_command"` standard) |
| `payload` | object | Data required for execution (e.g., `{ "command": "/yt pause" }`) |

---

## 🧪 4. Tutorial and Examples

### 4-1. Complex Example: mp3-player plugin (v4.0 latest spec)
An example `manifest.json` for the `mp3-player` that handles local media files and supports AI briefing.

```json
{
    "id": "mp3-player",
    "name": "Local Media Hub",
    "version": "4.0.0",
    "icon": "🎵",
    "priority": 50,
    "hybrid_level": 2,
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
    },
    "exports": {
        "sensors": [
            {
                "id": "is_playing",
                "name": "Playback Status",
                "unit": "boolean",
                "type": "boolean",
                "endpoint": "/api/plugins/mp3-player/status",
                "field": "playing"
            }
        ],
        "actions": [
            {
                "id": "stop_music",
                "name": "Stop Music",
                "description": "Immediately stops all currently playing local music.",
                "type": "terminal_command",
                "payload": { "command": "/mp3 pause" }
            }
        ]
    }
}
```

### 4-2. External Configuration Integration (config.json)
It is recommended to inject large assets or sensitive paths, such as media folders, externally through `config.json`.
- **`plugins/mp3-player/config.json`**:
  ```json
  { "media_directory": "D:\\MyMusic", "polling_interval": 300000 }
  ```
- **Backend processing**: Load the above path through `utils.load_json_config` in `router.py`.

---

## 🧩 5. Frontend: Runtime Environment (Capability Proxy)

When a plugin is loaded in v4.0, the `init(root, context)` function is called. All system resource access must be performed only through the **`context` object**.

### 5-1. Context API List (v4.0 Detailed)

| API | Description |
|---|---|
| `context.resolve(path)` | **[v4.0 Required]** Converts internal asset paths to absolute URLs. Mandatory when using ES module `import()`. |
| `context.requestCore(cmd, d)` | Calls system core commands (RELOAD_CONFIG, NOTIFY, REFRESH_UI, etc.). |
| `context.onSystemEvent(e, cb)`| Registers listeners for global system events (SYNC_CMD, SYNC_DATA, THEME_CHANGE). |
| `context.log(msg)` | Outputs console logs (The plugin tag is automatically included). |
| `context._t(key)` | Retrieves i18n translations (Links with `i18n.json`). |
| `context.askAI(task, data)` | Requests to AI Gateway and receives structured responses (display/briefing). |
| `context.speak(disp, brief)` | Integrated TTS and message speech. Avatar lip-sync and speech bubble sync are handled automatically. |
| `context.appendLog(tag, msg)` | Adds real-time text to the log window at the bottom of the system terminal. |
| `context.registerCommand(p, c)`| Directly registers terminal commands and specifies callbacks. |
| `context.triggerReaction(t, d)`| Triggers specific motions or emotional reactions of the avatar. |
| `context.playMotion(alias)` | Plays motion based on Custom Aliases specified by the user in Studio. |
| `context.changeModel(name)` | Real-time switching of the Live2D model. |
| `context.getMediaList()` | Queries media file lists based on `api.media_proxy` permissions. |
| `context.getAudioUrl(file)` | Converts media files into streaming URLs playable in the browser. |
| `context.environment.applyEffect(type)`| Triggers global environment visual effects (RAINY, SNOWY, STORM, CLEAR). |

---

## ⌨️ 6. Widget Frontend Standard Implementation Patterns

### 6-1. widget.js Standard Framework (v4.0 & Event Delegation)
Since v4.0, the principle is to manage interactions through **Event Delegation** at the `root` instead of attaching `onclick` to individual buttons.

```javascript
/**
 * AEGIS v4.0 Standard Plugin Implementation
 */
export default {
    updateTimer: null,
    root: null,
    ctx: null,

    /**
     * @param {HTMLElement} root - Iframe body element (Isolated DOM root)
     * @param {Object} context - System capability proxy object
     */
    init: async function (root, context) {
        this.root = root;
        this.ctx = context;
        context.log("Widget Initialize Starting...");

        // 1. Event Delegation Standard (Based on data-action)
        // ⛔ stopPropagation mandatory: prevent conflict with widget's own drag (Move) event
        root.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            e.stopPropagation(); 

            const action = btn.getAttribute('data-action');
            if (action === 'refresh') this.refresh();
            if (action === 'play') this.handlePlay();
        });

        // 2. Dynamic loading of external ES modules (Optional)
        const apiPath = context.resolve('assets/api.js');
        const { default: Api } = await import(apiPath);
        this.api = new Api(context.id);

        // 3. Initial data load and start polling
        await this.refresh();
        this.updateTimer = setInterval(() => this.refresh(), 300000);
        
        context.log("Widget Initialize Done.");
    },

    refresh: async function() {
        try {
            const data = await this.api.fetchData();
            // All DOM access must be performed only within the provided this.root
            this.root.querySelector('#status-text').textContent = data.message;
        } catch (e) {
            this.ctx.log("Refresh fail: " + e.message);
        }
    },

    destroy: function () {
        // Resource release (Mandatory for Memory Leak prevention)
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.root = null;
        this.ctx = null;
    }
};
```

### 6-2. Widget Lifecycle Details
The system manages widgets in the following stages:
1. **Injection**: The system fetches `entry.html` from `manifest.json` and injects it into the body inside the Iframe.
   - ⚠️ **Caution**: Since it's injected through `innerHTML`, **browser will NOT execute `<script>` tags written inside `widget.html`.** All logic must be written in `widget.js`.
2. **Initialization**: Immediately after HTML injection, `init(root, context)` of `widget.js` is called exactly once.
3. **Destruction**: `destroy()` is called when the user closes or refreshes the widget. Failure to clean up timers or global listeners here will cause system performance degradation.

---

## 🛠️ 7. Backend: Router and Service Standards

### 7-1. initialize_plugin (⛔ Mandatory Compliance Handler)
Every plugin router (`router.py`) must implement the `initialize_plugin()` function to register action handlers at system boot.

```python
from services.plugin_registry import register_plugin_action, register_context_provider

def initialize_plugin():
    # 1. Register deterministic actions (Mapping manifest.json > actions > id)
    register_plugin_action("my-plugin", "play", handle_play_cmd)
    
    # 2. Register Context Provider for the briefing system
    # Registering aliases allows immediate calling from the terminal with Korean aliases without / or Slash
    register_context_provider("my-plugin", get_current_info, aliases=["status", "report"])

def handle_play_cmd(params, target_id=None):
    # Call business logic...
    return {
        "text": "Executed successfully.",
        "sync_cmd": "RELOAD_WIDGET" # Frontend synchronization signal
    }
```

### 7-2. File Naming and Path Rules (⛔ Violation Prohibited)
- **Service**: Strictly follow the format `{plugin_id with hyphens converted to underscores}_service.py`.
- **Route**: Must strictly follow the format `@plugin_bp.route("/api/plugins/{id}/...")`. This is the sole criteria for `plugin_security_service` to identify the plugin and check permissions.

---

## 🤖 8. AI Response Standardization and Prompt Policy (v3.0+)

### 8-1. Standard Field Specification
Results of communication with AI services (Gemini, etc.) must follow the specifications below to separate terminal output and voice output noise.

| Field | Purpose | Characteristics |
|---|---|---|
| **`display`** | Visual output | Layout data including Markdown. Displayed directly in terminal logs. |
| **`briefing`** | Voice/Colloquial | Pure text for TTS. Natural colloquial language not containing Markdown symbols. |
| `sentiment` | Avatar Reaction | Emotion keywords for the avatar (`happy`, `serious`, `alert`, etc.). |
| `visual_type` | Bubble Icon | Icon type to be displayed at the top of the HUD speech bubble. |

### 8-2. Response Cleaning Specification
On the backend, Markdown wrappers (such as ```json) included in the AI's response must be removed using `utils.clean_ai_text()` before parsing.

---

## ⌨️ 9. Terminal Intent & Routing Guide

Based on the first character of the terminal input, the system immediately determines whether AI intervenes and the scope of data injection.

- **`#` (Deterministic Web Search)**: Forces the use of Google search tools instead of AI retrieval to bring in real-time information.
- **`@` (Multiple Context Alias Support)**: Forces the injection of the plugin's status data into the AI's response. (e.g., `@weather is it raining tomorrow?`)
- **`/` (Direct Command Processing)**: Immediately executes commands registered to a specific plugin. (No AI judgment)
- **None**: Independent judgment and conversation by the system AI (Gemini/Ollama).

---

## ⚠️ 10. Common Errors and Solutions (Troubleshooting)

### 10-1. Widget moving when clicking interactive elements
Solution: Call `e.stopPropagation()` in all clickable element handlers and ensure to include one of **`.no-drag`**, **`.interactive`**, or **`.clickable`** in the class.

### 10-2. Import error (Module not found)
Solution: In a v4.0 Iframe environment, relative paths cannot be imported directly. Always use the absolute URL converted by **`context.resolve(path)`** for synchronous/asynchronous imports.

---

## 🔄 11. Version History (Major Milestones)

| Version | Major Changes |
|---|---|
| v1.6.0 | First introduction of Plugin-X architecture (Shadow DOM based) |
| v1.8.0 | Implementation of **`exports` manifest spec** and Condition Watch routines |
| v2.2.0 | Establish **Fixed HUD Layout** specifications and Z-Index management policies |
| v2.4.5 | Introduction of **AXC (AEGIS Extreme Cache)** and Parallel Hydration |
| v3.7.0 | Standardization of **Deterministic Actions** and AI response standard fields |
| **v4.0.0** | Full transition to **Iframe Isolation**, ES module standardization, and completion of specs based on exhaustive audit |

---
**AEGIS Plugin-X Standard v4.0.0 Final Specification**
**This document is the final version created based on exhaustive audit results, and no content has been summarized or omitted.**
**Core Principle: Only documented content is the reality of the system.**
