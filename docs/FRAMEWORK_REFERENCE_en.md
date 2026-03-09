# AEGIS Plugin-X Framework Reference Guide (FRAMEWORK REFERENCE) v3.7.0

This document encompasses all references available to developers and AI agents within the AEGIS Plugin-X (v3.7.0) architecture. v3.4.0 introduced **Global Internationalization (I18n) Integrated Guidelines** and the **Platform-Independent Messaging Hub (BotManager)**. v3.7.0 further maximizes system reliability and responsiveness by adding **Deterministic Control** and **BotManager Centralized Routing**.

---

## ⚡ 0. Performance Architecture: AXC (AEGIS Extreme Cache)
Introduced in v2.4.5, **AXC** maximizes plugin boot speed.
- **IndexedDB**: All plugin assets (HTML/JS/CSS) are permanently stored in the browser's IndexedDB.
- **SHA256 Versioning**: If the server's hash matches, assets are loaded instantly in **under 10ms** without network downloads.
- **Two-Step Hydration**: The DOM structure is created first, followed by parallel asset injection, ensuring both loading speed and layer integrity.

---

## 🔐 1. Plugin-X Permissions List (Permissions)
To communicate with the external environment or access core system features, a plugin must register the corresponding permissions in the `"permissions"` array of `manifest.json`. Additionally, the Python backend router must be protected with the `@require_permission("...")` decorator. The full list of existing system permissions is as follows:

| Permission ID (Permission) | Name | Usage Examples (Plugin) | Description |
|---|---|---|---|
| `api.google_suite` | Google Workspace | `calendar`, `todo`, `gmail` | Read permissions for authenticated Google user data (Calendar, To-do, Gmail, etc.). |
| `api.notion` | Notion API Proxy | `notion` | Permission to query databases and manipulate pages using the user's Notion token. |
| `api.media_proxy` | Local Media Access | `mp3-player`, `media` | Permission to bypass security isolation and load local media resources (MP3, images). |
| `api.system_stats` | System Resource Stats| `system-stats` | System monitoring level permission to view hardware status (CPU, RAM, Storage). |
| `api.ai_gateway` | AI External Tunneling| `proactive-agent`, `ai` | AI control permission for proxy communication with external AI providers (Gemini, Grok, etc.). |
| `api.voice_service` | TTS Control | `proactive-agent`, `speaker`| Permission to directly control core Edge-TTS and audio playback/storage objects. |
| `api.io_control` | I/O & Config Control | `scheduler` | Permission to perform write operations on config files, schedules, and the I/O system. |
| `api.studio_service` | Live2D Core Control | `studio` | The most powerful permission to access Live2D model files, alias settings, and renderers. |
| `ENVIRONMENT_CONTROL` | Global Env Effects | `weather` | Permission to generate and control real-time global effects like `RAINY`, `SNOWY`, `STORM`. |

---

## 🔌 2. Frontend Communication: Context API Catalog
All frontend widgets (`widget.js`) must not modify the system core or access the browser's global object (`window`) directly. If system resources are required, communication must occur only through the **`context` (Capability Proxy) object** injected via `init(shadowRoot, context)`.

> [!IMPORTANT]
> **Event Propagation Blocking (v2.3)**: Interactive elements like buttons and checkboxes must call `e.stopPropagation()` in `mousedown` and `click` events. Additionally, add `.no-drag`, `.interactive`, or `.clickable` classes to clickable areas (divs, etc.) to let the system drag manager ignore them.

### 2-1. System Output
| Method Signature | Return | Description |
|---|---|---|
| `context.log(message: String)` | `void` | Prints a consistent log tagged with the plugin ID to the developer console. |
| `context.appendLog(tag: String, message: String)` | `void` | Prints progress or messages to the 'Terminal' log window located at the GUI bottom. |
| `context.speak(text: String, audioUrl?: String, visualType?: String)`| `void` | Converts text to speech instantly (Edge-TTS) and plays it while syncing avatar lips. |
| `context.environment.applyEffect(type: String)` | `void` | Triggers global effects like `RAINY`, `SNOWY`, `STORM`, or `CLEAR`. (Requires `ENVIRONMENT_CONTROL`) |

### 2-2. Avatar Control (Live2D Controller)
| Method Signature | Return | Description |
|---|---|---|
| `context.triggerReaction(type: String, data: Object, timeout?: Number)` | `void` | Controls avatar behavior. Choose between `"MOTION"` or `"EMOTION"`. (e.g., `context.triggerReaction('MOTION', { alias: 'superhappy' })`) |
| `context.playMotion(filename_or_alias: String)` | `void` | Instructs the avatar to play a one-time motion or expression. Supports Custom Aliases (`"joy"`, `"shock"`). |
| `context.changeModel(modelName: String)` | `void` | Changes or replaces the avatar character model in the dashboard in real-time. |

### 2-3. I/O, Language, & Net
| Method Signature | Return | Description |
|---|---|---|
| `context._t(key: String)` | `String` | Returns the translated string for the current language through the translation system. |
| `context.applyI18n()` | `void` | Automatically re-renders elements with the `.i18n` tag within the Shadow DOM in the current language. |
| `context.registerCommand(prefix: String, callback: Function)` | `void` | [Legacy] Registers a callback to execute background tasks when a user types a specific prefix. v3.7.0+ recommends using backend deterministic actions. |
| `context.triggerBriefing(feedbackEl: Element, options: Object)` | `void` | Commands the AI (Gemini, etc.) to perform a comprehensive tactical briefing using all system data. |
| `context.askAI(task: String, data: Object)` | `Promise<Object>`| Requests intention analysis or classification from the internal AI model. (Requires `api.ai_gateway`) **Note:** If the query includes the `--m` option, audio output will be skipped in `ai_gateway.js`. |

### 2-4. `context.registerCommand` Multi-parameter Parsing Convention
The callback function receives the **rest of the user's input string** as `param`. For subcommands or multiple arguments, follow the standard parsing convention below.

| Structure | Parsing Method | Example |
|---|---|---|
| Single Value | Use `cb(param)` directly | `/play music` → `param = "music"` |
| Subcommand + Arg | `param.split(' ', 1)` | `/obs add filename.md` → `["add", "filename.md"]` |
| Subcommand + Body | `param.split(' ', 2)` | `/obs add daily.md Meeting today` → `["add", "daily.md", "Meeting today"]` |

```javascript
// ✅ Standard Code for Multi-parameter Parsing
context.registerCommand('/obs', (param) => {
    const parts = param.trim().split(' ');
    const sub = parts[0];                            // Subcommand: "add", "read", etc.
    const rest = param.slice(sub.length).trim();     // The rest of the string

    if (sub === 'add') {
        const spaceIdx = rest.indexOf(' ');
        const filename = rest.slice(0, spaceIdx);    // "daily.md"
        const content  = rest.slice(spaceIdx + 1);  // "Meeting summary..."
        // → Send POST request to backend
    } else if (sub === 'read') {
        // rest = "filename.md" (Single argument)
    } else {
        context.appendLog('OBS', `Unknown command: ${sub}. Usage: /obs add [filename] [content]`);
    }
});
```

---

## 📡 3. Backend Standards (Backend Standards)
Plugin backend structures (`router.py`, `xxx_service.py`) must follow these rules for system integration.

### 3-1. Endpoint Isolation
**Absolute Rule:** All Flask Blueprint routes must be prefixed with `/api/plugins/{plugin_id}/`. Failing to do so will result in a 403 Forbidden error via the security parser.
```python
# ✅ Correct Standard
@my_plugin_bp.route("/api/plugins/notion/search") 

# ❌ Forbidden (Conflicts and bypasses security parser)
@my_plugin_bp.route("/api/notion/search") 
```

### 3-2. Backend Briefing Engine & Multi-Alias Integration (`services.plugin_registry`)
To include plugin data in AI briefings, you must register a provider.

> ⛔ **Caution (Location & Timing)**: `register_context_provider` must be called **only once** when the Python module is first loaded, not per request. Register it at the module level or during service class initialization.

- **Function Signature**: `register_context_provider(plugin_id: str, provider_func: callable, aliases: list = None)`
- **`register_plugin_action(plugin_id, action_id, handler)`**: (v3.7.0) Registers a backend handler for deterministic actions defined in `manifest.json`.
- **Provider Callback Spec**:
    - `provider_func` must not take any arguments.
    - **Return**: `str` (Text summary) or `dict` (Data structure). The AI engine uses this value to generate briefing sentences.
- **Multi-Alias Support (v2.8+)**:
    - Passing `aliases=['scheduler', 'routine']` synchronizes these synonyms with the frontend `CommandRouter` via the `/api/plugins/aliases` API.
    - **Effect**: Typing `/routine` in the terminal routes the intent to the target plugin ID.
    - 💡 **Intent Path**: `Input: @keyword` ➡️ `Inject Context`, `Input: /keyword` ➡️ `Execute Function`.

### 3-3. System Standard Utility Catalog (`utils.py`)
Core utilities provided for stable plugin development.

| Method | Input | Output | Description |
|---|---|---|---|
| `load_json_config` | `path: str` | `dict` | Safely loads a JSON file. Returns an empty dict on failure with error handling. |
| `save_json_config` | `path: str, data: dict, merge: bool` | `bool` | Atomic file write (Replace) to prevent crashes. |
| `clean_ai_text` | `text: str` | `str` | Strips markdown wrappers (```) and labels from AI responses. |
| `load_settings` | - | `dict` | Loads original data from `settings.json`. |

### 3-4. Media File Serving Pattern (Media Serving Pattern)
When serving local media files to the client with `api.media_proxy` permission, use the following standard pattern.

**Base Media Directory Convention:**
| Media Type | Base Path on Server | Description |
|---|---|---|
| MP3 / Audio | `static/media/mp3/` | Standard path for music, BGM, etc. |
| Image | `static/media/images/` | Background images, etc. |

**Required Security Pattern (`router.py`):**
```python
from flask import send_from_directory
import os

# ✅ Path traversal attacks must be blocked.
@plugin_bp.route("/api/plugins/{id}/media/stream/<filename>")
@login_required
@require_permission("api.media_proxy")
def stream_media(filename):
    # ⛔ Block path traversal
    if ".." in filename or filename.startswith("/"):
        return jsonify({"error": "Invalid filename"}), 400
    media_dir = get_media_dir()  # Returns absolute path
    return send_from_directory(media_dir, filename)
```

### 3-5. Backend External HTTP Request Rules
> [!IMPORTANT]
> **`csp_domains` are for the browser (Frontend) only.** Calling external URLs with `requests.get()` in the Python backend is unrelated to CSP.

| Situation | CSP Registration Required? | Permission Required? |
|---|---|---|
| JS calling external API (`fetch`) | **✅ Yes** | N/A |
| Python crawling external URL (`requests`) | **❌ No** | **❌ No** |
| Backend displaying external images on frontend | **✅ Yes** (Image domain) | N/A |

```python
# ✅ Backend Crawling Example (requests + BeautifulSoup + hashlib)
import requests
from bs4 import BeautifulSoup
import hashlib

def crawl_and_check(url: str, last_hash: str) -> dict:
    try:
        res = requests.get(url, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        content = soup.get_text()
        new_hash = hashlib.md5(content.encode()).hexdigest()
        return {"changed": new_hash != last_hash, "hash": new_hash}
    except Exception as e:
        return {"changed": False, "hash": last_hash, "error": str(e)}
```

### 3-6. Persistent Connection Services Pattern
Manage persistent connections using the **Singleton + Timeout Protection** pattern.

> [!WARNING]
> Maintaining a singleton without reconnection logic will result in errors after a server-side timeout. **Always include try/except and reconnection logic.**

**Standard Pattern (IMAP Example):**
```python
class EmailService:
    _conn = None  # Singleton object

    @classmethod
    def _get_conn(cls, host, user, password):
        try:
            if cls._conn: cls._conn.noop()
        except Exception: cls._conn = None # Discard dead connection

        if cls._conn is None:
            cls._conn = imaplib.IMAP4_SSL(host)
            cls._conn.login(user, password)
        return cls._conn

    @classmethod
    def check_new_emails(cls, config: dict) -> dict:
        try:
            conn = cls._get_conn(config.get("imap_host"), config.get("email"), config.get("app_password"))
            conn.select("INBOX")
            last_uid = config.get("last_uid", "0")
            _, data = conn.uid("search", None, f"UID {last_uid}:*")
            uids = data[0].split()
            new_mails = [u for u in uids if int(u) > int(last_uid)]
            return {"new_count": len(new_mails), "uids": [u.decode() for u in new_mails]}
        except Exception as e:
            cls._conn = None # Reset on error
            return {"new_count": 0, "error": str(e)}
```

---

## 🛠️ 4. Data Service & Selective Context (v3.7.0)
### 4-1. `DataService.collect_all_context` (Python)
- **Signature**: `collect_all_context(plugin_ids: list = None) -> dict`
- **Description**: Collects data from all active plugins. If `plugin_ids` is provided, it selectively collects data for those IDs, used when the AI analyzes only user-selected widgets.

### 4-2. Config Persistence Pattern
All plugins are encouraged to implement the following route for user-facing settings.

```python
# router.py example
@plugin_bp.route("/api/plugins/{id}/config", methods=["GET", "POST"])
@login_required
@standardized_plugin_response
def handle_config():
    if request.method == "POST":
        data = request.json  # Config object from UI
        current = load_json_config(CONFIG_PATH)
        current.update(data)
        save_json_config(CONFIG_PATH, current)
        return jsonify({"status": "success", "config": current})
    return jsonify(load_json_config(CONFIG_PATH))
```

---

## 🤖 5. AI Service Standards (v3.7.0)
### 5-1. Prompt Sync (`prompts.json`)
Personas are no longer hardcoded. `services/gemini_service.py` loads `prompts.json` from plugins and auto-replaces:
- `{{current_time}}`: Server time in 24h format.
- `{{modules}}`: List of active Plugin-X modules.

### 5-2. AI Response Sanitization & Action Sync
The backend processes AI responses via `utils.clean_ai_text()`:
1. **Markdown Removal**: Strips ```json, ``` wrappers.
2. **Tag Filtering**: Filters emotion tags and labels (`[DISPLAY]`, `AEGIS:`).
3. **Action Tag Detection**: If `[ACTION] SET_ALARM` is found, `BotManager` executes the handler or sends a HUD command.
4. **Auto-I18n Guidance**: Injects language-specific persona instructions based on the `lang` setting.

---

## 🔄 6. Backend-to-Frontend Communication (Polling & Sync)
> [!IMPORTANT]
> **Context APIs like `context.speak()` are Frontend-only.** For backend-to-frontend triggers, use **Polling** or the **sync_cmd** pattern.

### 6-1. HUD Real-time Sync (sync_cmd) 🎉NEW
v3.7.0 recommends direct UI refresh signals from the backend (Include `"sync_cmd": "refresh_ui"` in response).

### 6-2. Polling Architecture
```javascript
// ✅ widget.js: Frontend polling example
const check = async () => {
    const res = await fetch('/api/plugins/{id}/status');
    const data = await res.json();
    if (data.changed) context.speak(`Change detected: ${data.summary}`);
};
this.timer = setInterval(check, 60000);
```

---

## 🧬 7. Exports & Messaging Intelligence (BotManager) ✨UPDATED
### 7-1. Unified Command Prefix Specification
| Prefix | Mode | Intelligence Behavior |
|---|---|---|
| **`/@`** | **Hybrid** | Combines local widget data + external real-time search for comprehensive reasoning. |
| **`/`** | **Local** | Blocks external search. Focuses only on system widget data for secure, precise reporting. |
| **`/#`** | **Search** | Performs external real-time search immediately without system context. |

### 7-2. Command Priority (v3.7.0)
1. **System Core**: `/config`, `/help`, etc.
2. **Deterministic Actions**: `/play`, `/alarm`, etc. (Bypasses AI).
3. **Hybrid/@**, **Local/**, **Search/#**
4. **AI Fallback**: General natural language.

### 7-3. Platform-Independent Adapter (BotAdapter)
- **Abstraction**: Extend new channels by inheriting from `BotAdapter` without core modification.
- **Loose Coupling**: `BotManager` only exchanges standardized message objects without knowing adapter details.

---
*💡 This document serves as the official architecture agreement between AEGIS developers and system AI agents.*
