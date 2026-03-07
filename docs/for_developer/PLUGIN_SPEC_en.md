# AEGIS Plugin-X Specification (PLUGIN SPEC) v2.9.0

This document is the **Single Source of Truth** for all rules, APIs, and schemas required to develop plugins under the AEGIS Plugin-X architecture.

> [!TIP]
> **First time?** See [`QUICK_START_en.md`](QUICK_START_en.md) first.  
> Run `python create_plugin.py --id my-widget --name "My Widget"` to generate compliant scaffolding, then use this document as your reference.

---

## §1. Architecture Overview

AEGIS is a modular AI dashboard built on the **Plugin-X** architecture. Core principles:

- **Fully independent modules**: Each plugin is self-contained in `plugins/{id}/`
- **Add/remove by folder**: Extend or remove features without touching core files
- **Shadow DOM isolation**: CSS/JS pollution is physically blocked
- **Capability Proxy**: System resources accessed only through the `context` object
- **Schema-Driven AI**: All AI responses enforced as `display`/`briefing` JSON structures

### Standard Plugin Folder Structure

```text
/plugins/{plugin-id}/
├── __init__.py               # Package declaration (required, empty file)
├── manifest.json             # Metadata, permissions, CSP, exports (required)
├── config.json               # Plugin-specific settings (optional)
├── router.py                 # Flask Blueprint (optional)
├── {plugin_id}_service.py    # Business logic (optional, naming rule mandatory)
└── assets/
    ├── widget.html           # Shadow DOM UI skeleton
    ├── widget.js             # Frontend module (init/destroy)
    └── widget.css            # Styles (Shadow DOM isolated)
```

> ⚠️ Without `__init__.py`, relative imports (`from .xxx_service import ...`) will fail.

---

## §2. Mandatory Rules (⛔ HARD RULES)

Violations will break the system or create security vulnerabilities.

### 2-1. Files & Naming

| # | Rule | Consequence of Violation |
|---|---|---|
| 1 | Never place plugin logic in `/static/js/widgets/` or `/services/` | Core dependency created; removing module breaks system |
| 2 | Never name your service file `service.py`. MUST use **`{plugin_id}_service.py`** | Namespace collision causes other plugins to malfunction |
| 3 | Never delete `__init__.py` | All relative imports fail |

### 2-2. Routing & Security

| # | Rule | Consequence of Violation |
|---|---|---|
| 4 | All backend routes MUST follow **`/api/plugins/{plugin-id}/...`** pattern | `require_permission` parser can't identify plugin → 403 |
| 5 | Never use absolute `import service` in `router.py`. MUST use **`from .xxx_service import`** | Global module cache pollution |
| 6 | Plugin A must never directly `import` Plugin B's Python modules | Creates inter-plugin dependency |

### 2-3. Frontend Isolation

| # | Rule | Consequence of Violation |
|---|---|---|
| 7 | Avoid `window.xxx` globals in `widget.js`. MUST use `context` API only | Global pollution |
| 8 | DOM traversal via **`shadowRoot.querySelector()`** only (`document.getElementById` forbidden) | Shadow DOM isolation violation |
| 9 | `<script>` tags in `widget.html` **will not execute** (innerHTML injection) | All logic must go in `widget.js` |
| 10 | `<slot>` API is not available | Shadow DOM limitation |
| 11 | Clickable elements MUST have **`e.stopPropagation()`** + block `mousedown` | Interferes with widget drag |
| 12 | Clickable containers MUST have **`.no-drag`** or **`.interactive`** class | Drag manager captures events |
| 13 | `destroy()` MUST clear all `setInterval`, `setTimeout`, event listeners | Memory leak |

### 2-4. Backend Integration

| # | Rule | Consequence of Violation |
|---|---|---|
| 14 | `register_context_provider` called **once at module load only** (not inside route handlers) | Duplicate registration bug |
| 15 | Never use `json.load` directly. MUST use **`utils.load_json_config`** | Breaks exception handling consistency |
| 16 | `registerCommand` in `widget.js` MUST use **same prefix as manifest.json id** | Aliases can't find handler |

### 2-5. Recommendations (SOFT RULES)

- If you must use `window.xxx`, register in `init()` and clean up in `destroy()`
- Only read your own `config.json` (never read other plugins' config files directly)
- Command handlers must be defined inside the `widget.js` export object (no separate JS files)
- After modifying assets during development, restart server or clear browser cache to refresh AXC hashes

---

## §3. manifest.json Schema

### 3-1. Required Fields

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique plugin ID (**must match folder name**) |
| `name` | string | Display name shown to users |
| `version` | string | Semantic version |
| `entry.html` | string | Widget HTML file path |
| `entry.js` | string | Widget JS module path |

### 3-2. Optional Fields

| Field | Type | Description |
|---|---|---|
| `entry.css` | string | Widget CSS file path |
| `entry.backend` | string | Backend router filename (e.g., `"router.py"`) |
| `permissions` | string[] | System permission list |
| `csp_domains` | object | CSP external domain list |
| `layout.default_size` | string | Default widget size (`size-1`, `size-1-5`, `size-2`) |
| `layout.fixed` | boolean | `true` = Fixed HUD mode (pinned position, excluded from drag) |
| `layout.zIndex` | number | z-index for Fixed HUD |
| `hidden` | boolean | `true` = Backend-only, no UI |
| `exports` | object | Data/command declarations for scheduler integration |
| `icon` | string | Sidebar icon emoji |

### 3-3. `hidden: true` Behavior

- `entry.html`, `entry.js`, `entry.css` fields can be **omitted** (files not needed)
- Only `entry.backend` is required — system auto-registers the Blueprint
- Not shown in sidebar or dashboard grid
- **Use cases**: Data polling services, scheduler backends, external API proxies

### 3-4. `csp_domains` Specification

**Only needed when frontend (JS) fetches external URLs.** Backend (Python) `requests.get()` is unrelated to CSP.

```json
"csp_domains": {
    "connect-src": ["https://api.github.com", "https://*.openapi.com"],
    "img-src": ["https://*.openweathermap.org"],
    "frame-src": ["https://www.youtube.com"]
}
```

| Key | Purpose | Format Rule |
|---|---|---|
| `connect-src` | JS `fetch()`/XHR targets | Scheme required: `https://domain.com` |
| `img-src` | External `<img>` sources | Wildcard supported: `https://*.example.com` |
| `frame-src` | `<iframe>` sources | For YouTube embeds, etc. |
| `script-src` | External JS CDN | **Not recommended** — security risk |

> ⚠️ `data:` and `blob:` URIs are handled very conservatively in AEGIS CSP. If you need Base64 images, serve them as files from the backend.

### 3-5. `exports` Specification (Scheduler Condition Watch)

#### `exports.sensors[]`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | ✅ | Unique sensor ID |
| `name` | string | ✅ | User-facing display name (e.g., "Indoor Temperature") |
| `unit` | string | ✅ | Unit (e.g., "°C", "%") |
| `type` | string | ✅ | `number`, `string`, `boolean` |
| `endpoint` | string | ✅ | Data query API path |
| `field` | string | ✅ | Key to extract from API response JSON |

#### `exports.commands[]`

| Field | Type | Required | Description |
|---|---|---|---|
| `prefix` | string | ✅ | Command prefix (e.g., `/ha`) |
| `name` | string | ✅ | Command description |
| `examples` | string[] | ❌ | Usage examples |

> ⛔ Without `exports`, the plugin won't appear in Routine Manager condition monitoring.

### 3-6. `permissions` Full List

| Permission ID | Description | Example Plugins |
|---|---|---|
| `api.google_suite` | Google Calendar/Tasks/Gmail read access | `calendar`, `todo`, `gmail` |
| `api.notion` | Notion DB query/page manipulation | `notion` |
| `api.media_proxy` | Local media file access | `mp3-player` |
| `api.system_stats` | CPU/RAM system resource queries | `system-stats` |
| `api.ai_gateway` | AI proxy (Gemini, Grok, etc.) | `proactive-agent` |
| `api.voice_service` | TTS and audio control | `proactive-agent` |
| `api.io_control` | Settings file/schedule write access | `scheduler` |
| `api.studio_service` | Direct Live2D avatar model access | `studio` |
| `ENVIRONMENT_CONTROL` | Global weather effects (rain/snow/lightning) | `weather` |

---

## §4. Frontend Specification

### 4-1. Widget Lifecycle

1. **Injection**: System fetches `widget.html` → inserts via `shadowRoot.innerHTML`
2. **Initialization**: `widget.js` `init(shadowRoot, context)` called **once**
3. **Destruction**: `destroy()` called on widget removal/refresh → **must** clean up timers/listeners

### 4-2. Context API Catalog

All system resources are accessed through the **`context` object** injected via `init(shadowRoot, context)`.

#### System Output

| Method | Return | Description |
|---|---|---|
| `context.log(message)` | void | Console log with plugin tag |
| `context.appendLog(tag, message)` | void | Output to terminal log panel |
| `context.speak(text, audioUrl?, visualType?)` | void | TTS voice + speech bubble. Auto-syncs avatar lip-sync |
| `context.environment.applyEffect(type)` | void | Global visual effect (`RAINY`, `SNOWY`, `STORM`, `CLEAR`). Requires `ENVIRONMENT_CONTROL` |

#### Avatar Control

| Method | Return | Description |
|---|---|---|
| `context.triggerReaction(type, data, timeout?)` | void | `"MOTION"` or `"EMOTION"`. e.g., `context.triggerReaction('MOTION', { alias: 'happy' })` |
| `context.playMotion(filenameOrAlias)` | void | One-shot motion/expression. Custom aliases supported |
| `context.changeModel(modelName)` | void | Live swap avatar character |

#### I/O & Communication

| Method | Return | Description |
|---|---|---|
| `context._t(key)` | String | i18n translation string |
| `context.applyI18n()` | void | Re-translate `.i18n` elements in Shadow DOM |
| `context.registerCommand(prefix, callback)` | void | Register terminal command. ⛔ Prefix must match manifest.id |
| `context.triggerBriefing(feedbackEl, options)` | void | Trigger tactical briefing (auto-applies selective widget filter) |
| `context.askAI(task, data)` | Promise\<Object\> | Query AI model. Requires `api.ai_gateway` |
| `context.registerSchedule(name, type, callback)` | void | Register with global tick scheduler |
| `context.registerTtsIcon(type, icon)` | void | Register TTS bubble icon |

#### Media

| Method | Return | Description |
|---|---|---|
| `context.getMediaList()` | Promise | Media proxy file listing |
| `context.getAudioUrl(filename)` | String | Media streaming URL |

### 4-3. Command Registration & Multi-Parameter Parsing

```javascript
// ⛔ MUST register command with same prefix as manifest.id (for alias sync)
context.registerCommand('/my-plugin', (param) => this.handleCommand(param));
```

Callback receives the **entire string after the prefix** as `param`.

| Structure | Parsing Method | Example |
|---|---|---|
| Single value | Use `cb(param)` directly | `/play song` → `param = "song"` |
| Subcommand + arg | `param.split(' ', 1)` | `/obs add file.md` → `["add", "file.md"]` |
| Subcommand + rest | `param.split(' ', 2)` | `/obs add file.md content` → `["add", "file.md", "content"]` |

### 4-4. widget.js Standard Skeleton

```javascript
export default {
    updateTimer: null,

    init: async function(shadowRoot, context) {
        context.log("Initializing...");

        // Event binding (⛔ stopPropagation required)
        const btn = shadowRoot.querySelector('#my-btn');
        if (btn) {
            btn.addEventListener('click', (e) => { e.stopPropagation(); /* ... */ });
            btn.onmousedown = (e) => e.stopPropagation();
        }

        // Command registration (⛔ must match manifest.id prefix)
        context.registerCommand('/my-plugin', (cmd) => this.handleCommand(cmd));

        // Start polling
        this.updateTimer = setInterval(() => this.refresh(), 300000);
    },

    handleCommand(param) { /* Must be defined inside this object */ },

    destroy: function() {
        if (this.updateTimer) clearInterval(this.updateTimer); // ⛔ Cleanup required
    }
};
```

### 4-5. Design Guide (Premium Aesthetics)

| Item | Specification |
|---|---|
| **Typography** | Google Fonts (`Outfit`, `Inter`, `Roboto`) |
| **Glassmorphism** | `backdrop-filter: blur(12px)` + semi-transparent background |
| **Micro-animations** | Smooth `transition` on hover/state changes |
| **Colors** | System CSS variables (`--neon-blue`, `--neon-purple`, `--glass`, `--bg-dark`) |

---

## §5. Backend Specification

### 5-1. Decorator Reference

| Decorator | Import Path | Description |
|---|---|---|
| `@login_required` | `from routes.decorators import login_required` | Blocks unauthenticated requests |
| `@standardized_plugin_response` | `from routes.decorators import standardized_plugin_response` | On exception: returns JSON error instead of HTML 500: `{"status": "error", "message": "...", "type": "PluginExecutionError"}` |
| `@require_permission("...")` | `from services import require_permission` | Validates manifest permissions. Returns 403 if not declared |

**Application order** (top to bottom execution):
```python
@my_bp.route("/api/plugins/my-plugin/data")
@login_required                      # 1. Authentication
@require_permission("api.media_proxy") # 2. Permission
@standardized_plugin_response         # 3. Error safety net
def get_data():
    return jsonify(MyService.get_data())
```

### 5-2. Global Function Reference

System core objects exposed on `window`. **Plugins should NOT call these directly — use `context` API.**

| Global Function | Signature | context Equivalent |
|---|---|---|
| `window.speakTTS` | `(text, audioUrl?, visualType?, speechText?)` | `context.speak()` |
| `window.CommandRouter` | `.register(prefix, cb)`, `.route(cmd, model)` | `context.registerCommand()` |
| `window.reactionEngine` | `.checkAndTrigger(type, data, timeout)` | `context.triggerReaction()` |
| `window.appendLog` | `(source, message, isDebug?)` | `context.appendLog()` |
| `window.AEGIS_AI_MODEL` | `String` (`"gemini"`, `"ollama"`) | Direct reference OK (read-only) |
| `window.TTS_ICONS` | `Object` (icon mappings) | `context.registerTtsIcon()` |

### 5-3. Standard Utilities (`utils.py`)

| Function | Input | Output | Description |
|---|---|---|---|
| `load_json_config(path)` | `str` | `dict` | Returns `{}` if file missing, auto-handles `utf-8-sig` |
| `save_json_config(path, data, merge=True)` | `str`, `dict` | `bool` | Atomic save. `merge=True` preserves existing data |
| `clean_ai_text(text)` | `str` | `str` | Strips markdown wrappers/tags from AI responses |
| `load_settings()` | - | `dict` | Loads raw `settings.json` |

### 5-4. router.py Standard Skeleton

```python
import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required, standardized_plugin_response
from services import require_permission
from services.plugin_registry import register_context_provider
from utils import load_json_config, save_json_config
from .my_plugin_service import MyPluginService  # ⛔ Relative import required

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

my_plugin_bp = Blueprint("my_plugin", __name__)

# ⛔ Call once at module load only (NOT inside route handlers)
def get_context():
    return MyPluginService.get_status()

register_context_provider("my-plugin", get_context, aliases=["my plugin"])
```

### 5-5. `register_context_provider` Details

```python
register_context_provider(
    plugin_id: str,          # Must match manifest.json id
    provider_func: callable, # No args, returns str or dict
    aliases: list = None     # Aliases (e.g., ['news', 'headlines'])
)
```

**Alias flow:**
1. Backend: Aliases registered via `aliases` → auto-exposed at `/api/plugins/aliases`
2. Frontend: `CommandRouter` auto-syncs on startup
3. User input: `/news` → system translates to canonical plugin command
4. Handler: `widget.js`'s `registerCommand('/news', ...)` executes

> ⚠️ Without `registerCommand('/news', ...)` in `widget.js`, aliases will be skipped and fall through to AI query.

### 5-6. Backend → Frontend Polling Architecture

> ⛔ `context.speak()` and other Context APIs are **frontend-only (JS)**. Cannot be called from backend Python.

```
[Python Backend]              [JS Frontend (widget.js)]
   Crawl/collect data        ←── setInterval (e.g., 60s)
   Store results               ──→ /api/plugins/{id}/status
   (save_json_config)          Receive results, detect changes
                               On change → context.speak() ✅
```

---

## §6. AI Service Specification

### 6-1. Response Standard Fields

| Field | Purpose | Notes |
|---|---|---|
| **`display`** | Visual output | Markdown allowed. Shown in terminal log |
| **`briefing`** | Voice/bubble | Pure text for TTS. No markdown symbols |
| `sentiment` | Avatar reaction | `happy`, `neutral`, `serious`, `alert` |
| `visual_type` | HUD icon | `weather`, `finance`, `calendar`, `system`, etc. |

### 6-2. Prompt De-hardcoding

- Do NOT hardcode AI persona ("AEGIS") in prompts
- Load dynamically via `prompts.json`
- Available variables: `{{current_time}}`, `{{modules}}`

### 6-3. Gemini 400 Error Prevention

```python
# ⛔ MUST declare tools=[] for structured JSON output
response = model.generate_content(prompt, tools=[])
```

---

## §7. Scheduler Integration

The scheduler (`plugins/scheduler`) handles time/condition-based automation. **Do not modify scheduler code directly.**

### 7-1. Action Types

| Action | Description | Required Fields |
|---|---|---|
| `tactical_briefing` | Full summary briefing | - |
| `widget_briefing` | Specific widget briefing | `target` (widget id) |
| `speak` | TTS voice output | `text` |
| `terminal_command` | ⭐ Universal: terminal command | `command` |
| `api_call` | ⭐ Universal: direct API call | `url`, `method`, `body` |

### 7-2. Condition Watch Routines

Data-condition triggered routines (not time-based):

```json
{
    "condition": {
        "source": "/api/plugins/home-assist/temperature",
        "field": "temp",
        "type": "number",
        "operator": ">=",
        "value": 28
    },
    "cooldown_min": 30
}
```

| type | Conversion | Available Operators |
|---|---|---|
| `number` | `parseFloat` | `>=`, `<=`, `>`, `<`, `==`, `!=` |
| `string` | None | `==`, `!=` |
| `boolean` | Boolean cast | `==`, `!=` |

---

## §8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 403 Forbidden on API call | Permission not in manifest or route path doesn't match `/api/plugins/{id}/...` | Check `permissions` array, fix URL pattern |
| Blueprint not loading (404) | Missing `__init__.py` or `entry.backend` not set | Verify file exists |
| Other plugins malfunctioning | Service file named `service.py` (namespace collision) | Rename to `{id}_service.py` |
| Widget drags on click | Missing `e.stopPropagation()` or `.no-drag` class | See §2-3 |
| Background activity after removal | `clearInterval` not called in `destroy()` | Clean up timers/listeners |
| Alias (Korean command) not working | `registerCommand` prefix doesn't match manifest.id | See §4-3 |
| Frontend fetch blocked | Domain not registered in `csp_domains` | See §3-4 |
| Gemini 400 error | Missing `tools=[]` | See §6-3 |

---

**AEGIS Plugin-X Specification v2.9.0**  
**This document is the Single Source of Truth for all plugin development rules, APIs, and schemas.**

> 💡 Run `python create_plugin.py --help` to see all boilerplate generator options.
