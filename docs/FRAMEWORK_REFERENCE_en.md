# AEGIS Plugin-X Framework Reference Guide (FRAMEWORK REFERENCE) v4.0.0

This document comprehensively lists all references available for developers and AI agents in the AEGIS Plugin-X (v4.0.0) architecture environment. In v4.0.0, the **Iframe Isolation Architecture**, **Centralized AI Schema (ai_schemas.py)**, and **Parallel Hydration** have been introduced to maximize system stability, security, and response speed.

---

## ⚡ 0. Core Technical Architecture: AXC & Iframe Isolation

The architecture introduced from v4.0 prioritizes performance and isolation (Sandbox).

- **Iframe Isolation (v4.0)**: Every widget runs within an independent Iframe. This physically resolves the limitations of legacy Shadow DOM (Global CSS variable pollution, JS global object collisions, etc.).
- **AXC (AEGIS Extreme Cache)**: All plugin assets (HTML/JS/CSS) are permanently stored in the browser's IndexedDB, and if they match the server via SHA256 Versioning, they are loaded instantly in **less than 10ms**.
- **Two-Step Parallel Hydration**: The DOM structure (Iframe Body) is created first, and then assets are injected in parallel, ensuring both loading speed and layer consistency.

---

## 🔐 1. Plugin-X Security Permissions List (Permissions)

To allow a plugin to communicate with the external environment or access major core systems, you must register the corresponding permission in the `"permissions"` array within `manifest.json`, and protect it with the `@require_permission("...")` decorator in the Python backend router. The full list of existing system permissions is as follows:

| Permission ID | Name | Primary Usage (Plugin Examples) | Description |
|---|---|---|---|
| `api.google_suite` | Google Workspace | `calendar`, `todo`, `gmail` | Permission to read data of authenticated Google users, such as Google Calendar, To-do, and Gmail. |
| `api.notion` | Notion API Proxy | `notion` | Delegated execution authority to query DBs and manipulate pages using the user's Notion token. |
| `api.media_proxy` | Local Media Access | `mp3-player`, `media` | Permission to bypass security isolation and load media (MP3, images) resources from the user's local disk. |
| `api.system_stats` | System Resource Query | `system-stats` | System monitoring level permission to query the current hardware status of the server/PC, such as CPU, memory, and storage space. |
| `api.ai_gateway` | AI External Tunneling | `proactive-agent`, `ai` | AI control permission that enables proxy communication with external AI providers (Gemini, Grok, etc.) registered in the system. |
| `api.voice_service` | Voice Service Control | `proactive-agent`, `speaker`| Permission to directly control the core's Edge-TTS and audio playback/storage objects. |
| `api.io_control` | I/O and Config Control | `scheduler` | Permission to perform write operations on application configuration files (`config`), schedule data, and I/O systems. |
| `api.studio_service` | Live2D Core Control | `studio` | The most powerful permission that allows plugins to directly access and forcefully patch/modify Live2D avatar model configuration files, Alias setting files, and the avatar renderer. |
| `ENVIRONMENT_CONTROL` | Global Env Visual Effects| `weather` | Permission to create and control real-time environmental effects such as rain (`RAINY`), snow (`SNOWY`), and lightning (`STORM`) across the entire screen. |

---

## 🔌 2. Frontend Communication Specification: Context API Catalog

All frontend widgets (`widget.js`) must not modify the system core or access the browser's global object (`window`). If system resources are needed, communication must be done only through the **`context` (Capability Proxy) object** injected as `init(root, context)`. (From v4.0, `root`, which is the `document.body` of the Iframe, is passed instead of the ShadowRoot.)

> [!IMPORTANT]
> **Blocking Event Propagation (v2.3/v4.0)**: Buttons, checkboxes, etc., inside the widget must call `e.stopPropagation()` in `mousedown` and `click` events. Also, add `.no-drag`, `.interactive`, or `.clickable` classes to clickable areas (divs, etc.) so that the system drag manager ignores them.

### 2-1. System Interaction (System Output)
| Method Signature | Return Value | Description |
|---|---|---|
| `context.log(message: String)` | `void` | Outputs a consistent log with the plugin's tag to the developer tools console. |
| `context.appendLog(tag: String, message: String)` | `void` | Outputs progress or messages to the 'Common Terminal Log Window (Terminal)' located at the bottom of the GUI. |
| `context.speak(text: String, audioUrl?: String, visualType?: String)`| `void` | Immediately converts the sentence to Edge-TTS and outputs it through the speaker, while the avatar synchronizes its lip movements (Lip-sync). |
| `context.environment.applyEffect(type: String)` | `void` | Triggers global visual effects such as rain (`RAINY`), snow (`SNOWY`), lightning (`STORM`), or removal (`CLEAR`). (`ENVIRONMENT_CONTROL` required) |

### 2-2. Avatar Control (Live2D Controller)
| Method Signature | Return Value | Description |
|---|---|---|
| `context.triggerReaction(type: String, data: Object, timeout?: Number)` | `void` | Controls the avatar's behavior when specific conditions are met. Choose between `"MOTION"` and `"EMOTION"`. (e.g., `context.triggerReaction('MOTION', { alias: 'superhappy' })`) |
| `context.playMotion(filename_or_alias: String)` | `void` | Instructs the avatar to play a one-time motion/expression. Custom Aliases created by the user (`"joy"`, `"shock"`, etc.) can also be used immediately. |
| `context.changeModel(modelName: String)` | `void` | Real-time changing/replacement of the avatar character on the dashboard screen. |

### 2-3. I/O, Language, and Communication (I/O & Net)
| Method Signature | Return Value | Description |
|---|---|---|
| `context._t(key: String)` | `String` | Returns a string matching the currently set language via the translation system. |
| `context.applyI18n()` | `void` | When called, it immediately auto-replaces (re-renders) `.i18n` tagged elements inside the root into the current language. |
| `context.resolve(path: String)` | `String` | [v4.0] Returns the absolute URL of internal plugin assets (JS, images, etc.). Mandatory when using ES module `import()`. |
| `context.registerCommand(prefix: String, callback: Function)` | `void` | [Legacy] Registers a `callback` function to intercept and run background tasks when the user types a specific prefix (e.g., `/weather`) in the terminal input. Using backend deterministic actions (`manifest.json > actions`) is recommended since v3.7.0. |
| `context.triggerBriefing(feedbackEl: Element, options: Object)` | `void` | Instructs to scrape all system data and execute a comprehensive tactical briefing via AI (Gemini, etc.). |
| `context.askAI(task: String, data: Object)` | `Promise<Object>` | Requests complex intention analysis, classification tasks, etc., to the internal AI model. (`api.ai_gateway` required) **Note:** If the command typed by the user includes the `--m` option, voice output is skipped in the `ai_gateway.js` stage. |

### 2-4. `context.registerCommand` Multi-parameter Parsing Convention
The callback function receives the **entire remaining string** after the `prefix` as `param`. If there are multiple subcommands or arguments, follow the standard parsing convention below.

| Structure | Parsing Method | Example |
|---|---|---|
| Single Value | Direct use of `cb(param)` | `/play music` → `param = "music"` |
| Subcommand + Arg | `param.split(' ', 1)` | `/obs add filename.md` → `["add", "filename.md"]` |
| Subcommand + Rest | `param.split(' ', 2)` | `/obs add daily.md today meeting` → `["add", "daily.md", "today meeting"]` |

```javascript
// ✅ Standard code for multi-parameter parsing
context.registerCommand('/obs', (param) => {
    const parts = param.trim().split(' ');
    const sub = parts[0];                            // Subcommand: "add", "read", etc.
    const rest = param.slice(sub.length).trim();     // Entire remaining string

    if (sub === 'add') {
        const spaceIdx = rest.indexOf(' ');
        const filename = rest.slice(0, spaceIdx);    // "daily.md"
        const content  = rest.slice(spaceIdx + 1);  // "meeting summary today..."
        // → Backend POST request
    } else if (sub === 'read') {
        // rest = "filename.md" (Single argument)
    } else {
        context.appendLog('OBS', `Unknown command: ${sub}. Use format: /obs add [filename] [content]`);
    }
});
```

---

## 📡 3. Backend Communication Specification (Backend Standards)

The backend structure files (`router.py`, `xxx_service.py`) of each plugin must follow these rules so that the system parser can read and execute them.

### 3-1. Endpoint Isolation Standard
**Absolute Rule:** Every Flask Blueprint's `@app.route()` written in any plugin must start with the prefix `/api/plugins/{your_plugin_id}/...`.
If this is not followed, access will be blocked (403) as it cannot pass the `require_permission` decorator.
```python
# ✅ Correct standard
@my_plugin_bp.route("/api/plugins/notion/search") 

# ❌ Forbidden bottleneck (Conflicts with other apps, bypasses security parser)
@my_plugin_bp.route("/api/notion/search") 
```

### 3-2. Backend Briefing Engine + Multi-alias Integration (`services.plugin_registry`)
To include the plugin's status data when a user requests an AI briefing, you must register a Provider.

> ⛔ **Caution (Location and Timing)**: `register_context_provider` must be called **only once when the Python module is first loaded**, not for each Request. Register it only once at the module-level or during the initialization of the service class.

- **Function Signature**: `register_context_provider(plugin_id: str, provider_func: callable, aliases: list = None)`
- **`register_plugin_action(plugin_id, action_id, handler)`**: (v3.7.0) Registers a backend handler to process deterministic actions defined in `manifest.json`.
- **Provider Callback Specification**:
    - `provider_func` must not take arguments.
    - **Return Value**: `str` (text summary) or `dict` (data structure). The AI engine reads this value to generate briefing sentences.
- **Multi-alias Support (v2.8+)**:
    - Passing synonyms like `aliases=['scheduler', 'routine']` will immediately synchronize in real-time with the frontend `CommandRouter` via the backend API `/api/plugins/aliases`.
    - **Behavioral Effect**: When `schedule` or `/schedule` is typed in the terminal, the router converts it to the target plugin ID `/my-plugin`.
    - 💡 **Intent Path**: `Input: @schedule` ➡️ `Context injection`, `Input: /schedule` ➡️ `Feature execution`.

---

## 🛠️ 4. Data Service & Selective Context

Backend data filtering specifications for briefing performance optimization.

### 4-1. `DataService.collect_all_context` (Python)
- **Signature**: `collect_all_context(plugin_ids: list = None) -> dict`
- **Description**: Collects data from all currently active plugins. If `plugin_ids` is passed, it selectively collects data from plugins with those IDs. Used by the briefing engine to analyze only user-selected widgets.

### 4-2. Config Persistence Standard API Pattern
Every plugin is recommended to implement the following route so that users can change settings within the widget.

```python
# router.py example
@plugin_bp.route("/api/plugins/{id}/config", methods=["GET", "POST"])
@login_required
@standardized_plugin_response
def handle_config():
    if request.method == "POST":
        data = request.json  # Config object sent from the UI
        current = load_json_config(CONFIG_PATH)
        current.update(data)
        save_json_config(CONFIG_PATH, current)
        return jsonify({"status": "success", "config": current})
    return jsonify(load_json_config(CONFIG_PATH))
```

---

## 🤖 5. AI Service & Prompt Standards

A newly introduced guide for the prompt architecture to ensure consistent response and cleaning of the system.

### 5-1. Prompt Synchronization (`prompts.json`)
Agent personas are no longer hard-coded. `services/gemini_service.py` loads and executes the plugin's `prompts.json` and automatically replaces the following variables:
- `{{current_time}}`: Current server time in 24-hour format.
- `{{modules}}`: List of names and descriptions of currently active Plugin-X modules.

### 5-2. AI Response Cleaning & Action Sync
The backend processes AI engine responses through `utils.clean_ai_text()`:
1. **Remove Markdown**: Removes Markdown wrappers (```json, ```).
2. **Tag Filtering**: Filters emotion tags or labels (`[DISPLAY]`, `AEGIS:`).
3. **Action Tag Detection**: If special tags like `[ACTION] SET_ALARM` are included in the response, `BotManager` interprets them and executes the corresponding plugin's handler or sends commands to the HUD.
4. **Automatic Multi-language Instruction**: Injects multi-language persona instructions according to the user's `lang` setting via `utils.get_i18n()`.

### 5-3. AI Response Structuring: AI Schema (ai_schemas.py) ✨NEW
[v4.0] To ensure consistency and parsing stability of AI responses, all responses are forced into JSON schemas. You must strictly comply with the specifications defined in `services/ai_schemas.py`.

#### 5-3-1. BRIEFING_SCHEMA (For Tactical Briefings)
| Field | Type | Description |
|---|---|---|
| `briefing` | string | A professional and detailed tactical report of 5~10 sentences about the situation (Markdown possible). |
| `voice` | string | A warm and friendly 2~3 sentence summary to be read to the user (Using polite language). |
| `sentiment` | enum | The most suitable emotional state for the current situation (`happy`, `neutral`, `serious`, `alert`). |
| `visual_type` | enum | The type of information that should be emphasized (`weather`, `finance`, `calendar`, `email`, `none`). |

#### 5-3-2. COMMAND_SCHEMA (For Command Processing)
| Field | Type | Description |
|---|---|---|
| `response` | string | Response message to be shown to the user. |
| `briefing` | string | Summary text for voice conversion. |
| `action` | enum | System action to perform (`navigate`, `toggle`, `search`, `none`). |
| `target` | string | Target of the action (URL, widget ID, etc.). |
| `sentiment` | enum | Suitable emotional state for the current situation. |

---

### 3-3. System Standard Utility Catalog (`utils.py`)
Core utilities provided for the stability of plugin development resources.

| Method | Input | Output | Description |
|---|---|---|---|
| `load_json_config` | `path: str` | `dict` | Safely loads JSON files. Returns an empty dictionary and completes error handling if absent. |
| `save_json_config` | `path: str, data: dict, merge: bool` | `bool` | Writes files. Prevents crashes with an atomic replacement (Replace) method. |
| `clean_ai_text` | `text: str` | `str` | Extracts pure text by removing Markdown wrappers (```) and indices/labels from AI responses. |
| `load_settings` | - | `dict` | Loads original data from `settings.json`. |

### 3-4. Media Serving Pattern
When providing local media files to the client with `api.media_proxy` permission, the following standard pattern must be followed.

**Default Media Directory Conventions:**
| Media Type | Default Server Path | Description |
|---|---|---|
| MP3 / Audio | `static/media/mp3/` | Base path for audio files like music and BGM. |
| Images | `static/media/images/` | Background images, etc. |

**Mandatory Security Pattern (`router.py`):**
```python
from flask import send_from_directory
import os

# ✅ Path traversal attacks must be defended.
@plugin_bp.route("/api/plugins/{id}/media/stream/<filename>")
@login_required
@require_permission("api.media_proxy")
def stream_media(filename):
    # ⛔ Path traversal prevention mandatory
    if ".." in filename or filename.startswith("/"):
        return jsonify({"error": "Invalid filename"}), 400
    media_dir = get_media_dir()  # Returns path from config.json or default
    return send_from_directory(media_dir, filename)
```

### 3-5. External HTTP Routing from Backend

> [!IMPORTANT]
> **`csp_domains` is for browser (frontend) only.** Calling an external URL with `requests.get()` from the Python backend is completely irrelevant to CSP.

| Situation | CSP Registration Required? | Permission Required? |
|---|---|---|
| External API call from JS (`fetch`) | **✅ Yes** | Not Applicable |
| Crawling external URL from Python (`requests`) | **❌ No** | **❌ No** |
| Displaying external images on frontend from backend | **✅ Yes** (Register image domain) | Not Applicable |

```python
# ✅ Backend crawling example (requests + BeautifulSoup + hashlib)
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
Persistent connection services must be managed with a **Singleton + Timeout Defense** pattern.

> [!WARNING]
> Maintaining a singleton without reconnection logic will result in an error after a server-side timeout. **Be sure to include reconnection logic after try/except.**

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
            cls._conn = None # Initialize on error
            return {"new_count": 0, "error": str(e)}
```

**Recommended Patterns by Connection Type:**
| Connection Type | Recommended Method | Notes |
|---|---|---|
| IMAP (Read Email) | Singleton + NOOP survival check | SSL required, use app password |
| SMTP (Send Email) | Connect for each request, release immediately | - |
| WebSocket | Singleton + ping/pong check | Reconnection backoff implementation recommended |
| SQLite/JSON | Use `utils` tools | - |

---

## 🔄 6. Backend → Frontend Communication Patterns (Polling & Sync)

> [!IMPORTANT]
> **Context APIs like `context.speak()` are for frontend only.** Attempting to call them directly from the backend will result in an error. Be sure to use the **Frontend Polling** or **sync_cmd** patterns.

### 6-1. HUD Real-time Sync (sync_cmd) ✨NEW
Since v3.7.0, it is recommended for the backend to directly send UI update signals. (Include `"sync_cmd": "refresh_ui"` in the backend handler return value)

### 6-2. Standard Polling Pattern
```
[Python Backend]         [JS Frontend (widget.js)]
   Execute crawling     ←── setInterval (e.g., every 60s)
   Save status result   ──→ Call /api/plugins/{id}/status
   (save_json_config)      Check for changes after receiving result
                           Call context.speak() if change detected ✅
```

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

### 7-1. Integrated Command Symbol Specification
| Symbol | Mode | Intelligence Behavior |
|---|---|---|
| **`/@`** | **Hybrid** | Combines local widget data collection + external real-time search for comprehensive reasoning answers. |
| **`/`** | **Local** | Blocks external search. Summarizes only widget data within the system for secure/precise reporting. |
| **`/#`** | **Search** | Performs only instant external real-time search without system data. |

### 7-2. Command Processing Priority (v3.7.0)
1. **System Core**: `/config`, `/help`, etc.
2. **Deterministic Actions**: `/play`, `/alarm`, etc. (No AI intervention).
3. **Hybrid/@**, **Local/**, **Search/#**
4. **AI Fallback**: General natural language.

### 7-3. Platform Independent Adapter (BotAdapter)
- **Abstraction**: Extend new channels without core modification by inheriting the `BotAdapter` class.
- **Weak Coupling**: `BotManager` only exchanges standardized message objects and does not know adapter details.

---
*💡 This document is the most accurate architectural mutual agreement between AEGIS developers and system AI agents.*
