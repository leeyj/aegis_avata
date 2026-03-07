# AEGIS Plugin-X Framework Reference Guide (v1.9)

This document is a comprehensive reference summarizing all **available permissions, declarable system resources (Exports), frontend communication standards (Context API), and backend communication standards** that developers and AI agents can utilize within the AEGIS Plugin-X (v1.9) architecture. Real-time environment control permissions have been added starting from v1.9.

---

## 🔐 1. Plugin-X Security Permissions

To communicate with external environments or access key core systems, a plugin must register the corresponding permission in the `"permissions"` array within `manifest.json`. In the Python backend router, these must be protected with the `@require_permission("...")` decorator. The complete list of existing system permissions is as follows:

| Permission ID | Permission Name | Example Usage (Plugin) | Description |
|---|---|---|---|
| `api.google_suite` | Google Workspace | `calendar`, `todo`, `gmail` | Permission to read data from an authenticated Google user (Calendar, Tasks, Gmail, etc.). |
| `api.notion` | Notion API Proxy | `notion` | Delegated execution permission to query DBs and manipulate pages using the user's Notion token. |
| `api.media_proxy` | Local Media Access | `mp3-player`, `media` | Permission to bypass security isolation and load media resources (MP3, images) from the user's local disk. |
| `api.system_stats` | System Resource Inquiry | `system-stats` | System monitoring level permission to query the current hardware status (CPU, memory, storage) of the server/PC. |
| `api.ai_gateway` | AI External Tunneling | `proactive-agent`, `ai` | AI control permission enabling proxy communication with registered external AI providers (Gemini, Grok, etc.). |
| `api.voice_service` | TTS Control Permission | `proactive-agent`, `speaker` | Permission to directly control the core Edge-TTS and audio playback/storage objects. |
| `api.io_control` | I/O & Settings Control | `scheduler` | Permission to perform write operations on the application configuration file (`config`), schedule data, and I/O system. |
| `api.studio_service` | Live2D Core Control | `studio` | The most powerful permission, allowing direct access to Live2D avatar model configuration files, Alias files, and the avatar renderer for forced patches/modifications. |
| `ENVIRONMENT_CONTROL` | Global Environment Effects | `weather` | Permission to create and control real-time global environment effects such as rain (`RAINY`), snow (`SNOWY`), and lightning (`STORM`). |

---

## 🔌 2. Frontend Communication: Context API Catalog

All frontend widgets (`widget.js`) must not modify the system core or directly access the browser's global object (`window`). If system resources are needed, communication must occur exclusively through the **`context` (Capability Proxy) object** injected via `init(shadowRoot, context)`.

### 2-1. System Output
| Method Signature | Return Value | Description |
|---|---|---|
| `context.log(message: String)` | `void` | Prints a consistent log tagged with the plugin's ID to the developer console. |
| `context.appendLog(tag: String, message: String)` | `void` | Prints messages or progress to the 'Common Terminal Log Window' at the bottom of the GUI. |
| `context.speak(text: String, audioUrl?: String, visualType?: String)`| `void` | Instantly converts text to speech via Edge-TTS and outputs it to the speaker, while the avatar performs lip-sync. |
| `context.environment.applyEffect(type: String)` | `void` | Triggers global visual effects like rain (`RAINY`), snow (`SNOWY`), lightning (`STORM`), and removal (`CLEAR`). (Requires `ENVIRONMENT_CONTROL` permission) |

### 2-2. Avatar Control (Live2D Controller)
| Method Signature | Return Value | Description |
|---|---|---|
| `context.triggerReaction(type: String, data: Object, timeout?: Number)` | `void` | Controls the avatar's behavior when specific conditions are met. Choose between `"MOTION"` and `"EMOTION"`. (e.g., `context.triggerReaction('MOTION', { alias: 'superhappy' })`) |
| `context.playMotion(filename_or_alias: String)` | `void` | Commands the avatar to play a one-time motion/expression. Custom Aliases (e.g., `"joy"`, `"shock"`) can be used directly. |
| `context.changeModel(modelName: String)` | `void` | Changes/replaces the avatar character on the dashboard in real-time. |

### 2-3. I/O, Language & Connectivity
| Method Signature | Return Value | Description |
|---|---|---|
| `context._t(key: String)` | `String` | Returns a translated string matching the current language setting. |
| `context.applyI18n()` | `void` | Immediately automatically replaces `.i18n` tagged elements inside the Shadow DOM with the current language. |
| `context.registerCommand(prefix: String, callback: Function)` | `void` | Registers a `callback` function to intercept and execute background tasks when a user types a specific prefix (e.g., `/weather`) in the terminal. |
| `context.triggerBriefing(feedbackEl: Element, options: Object)` | `void` | Instructs the system to collect all data and perform a comprehensive tactical briefing via AI (Gemini, etc.). |
| `context.askAI(task: String, data: Object)` | `Promise<Object>` | Requests complex intent analysis or classification from the internal AI model. (Requires `api.ai_gateway`) |

### 2-4. `context.registerCommand` Multi-Parameter Parsing Convention
The callback function receives the **entire remaining string** inputted by the user as a single `param` argument. If your command uses subcommands or multiple arguments, follow this standard parsing pattern.

| Structure | Parsing Method | Example |
|---|---|---|
| Single Value | Use `cb(param)` directly | `/play music` → `param = "music"` |
| Subcommand + Single Arg | `param.split(' ', 1)` | `/obs add filename.md` → `["add", "filename.md"]` |
| Subcommand + Rest String | `param.split(' ', 2)` | `/obs add daily.md Today's meeting` → `["add", "daily.md", "Today's meeting"]` |

```javascript
// ✅ Standard pattern for parsing multiple parameters
context.registerCommand('/obs', (param) => {
    const parts = param.trim().split(' ');
    const sub = parts[0];                            // Subcommand: "add", "read", etc.
    const rest = param.slice(sub.length).trim();     // The entire remaining string

    if (sub === 'add') {
        const spaceIdx = rest.indexOf(' ');
        const filename = rest.slice(0, spaceIdx);    // "daily.md"
        const content  = rest.slice(spaceIdx + 1);  // "Today's meeting notes..."
        // → perform POST request to backend
    } else if (sub === 'read') {
        // rest = "filename.md" (single argument)
    } else {
        context.appendLog('OBS', `Unknown command: ${sub}. Use: /obs add [file] [content]`);
    }
});
```

---

## 📡 3. Backend Communication Standards

Backend files for each plugin (`router.py`, `xxx_service.py`) must follow these rules for the system parser to read and execute them correctly.

### 3-1. Endpoint Isolation Standard
**Absolute Rule:** All Flask Blueprint `@app.route()` definitions in a plugin must use a path prefix in the format `/api/plugins/{your_plugin_id}/...`.
Failure to follow this will cause the `require_permission` decorator to fail, resulting in blocked access (403).
```python
# ✅ Correct Standard
@my_plugin_bp.route("/api/plugins/notion/search") 

# ❌ Forbidden (Conflicts with other apps, bypasses security parser)
@my_plugin_bp.route("/api/notion/search") 
```

### 3-2. Connecting to the Backend Briefing Engine (`services.plugin_registry`)
To include plugin data in AI briefings, register a data provider in `router.py`.

> ⛔ **CAUTION (Exact Timing)**: `register_context_provider` must be called **exactly once when the Python module is first loaded**, NOT within a per-request route (`@app.route`). Place it at the module-level or within a service class initialization block.

- **Signature**: `register_context_provider(plugin_id: str, provider_func: callable)`
- **Provider Callback Spec**: 
    - `provider_func` must accept zero arguments.
    - **Return Value**: Must return a `str` (text summary) or `dict` (structured data).

### 3-3. Backend Utility Catalog (`utils.py`)
Essential utilities for safe and consistent plugin operation.

| Method | Input | Output | Description |
|---|---|---|---|
| `load_json_config` | `path: str` | `dict` | Safely loads JSON. Returns `{}` if file missing with `utf-8-sig` support. |
| `save_json_config` | `path: str, data: dict, merge: bool` | `bool` | Atomic file write. Keeps existing keys if `merge=True`. |
| `clean_ai_text` | `text: str` | `str` | Strips markdown wrappers (```) and system labels from AI response. |
| `load_settings` | - | `dict` | Loads data from the main `settings.json`. |

### 3-4. Media File Serving Standard (Media Serving Pattern)
When using `api.media_proxy` to serve local media files to the client, you **must** follow this standard pattern. Arbitrary path choices will cause conflicts with existing plugins.

**Default Media Directory Convention:**
| Media Type | Default Server Path | Notes |
|---|---|---|
| MP3 / Audio | `static/media/mp3/` | Standard path for music, BGM, and audio files |
| Images | `static/media/images/` | Background images and other media |
| User-Defined | `media_directory` field in `config.json` | Use an absolute path to override the default |

**Required Security Pattern (`router.py`):**
```python
from flask import send_from_directory
import os

# ✅ Always defend against path traversal attacks.
@plugin_bp.route("/api/plugins/{id}/media/stream/<filename>")
@login_required
@require_permission("api.media_proxy")
def stream_media(filename):
    # ⛔ Path traversal guard: DO NOT deploy without this check.
    if ".." in filename or filename.startswith("/"):
        return jsonify({"error": "Invalid filename"}), 400
    media_dir = get_media_dir()  # Returns path from config.json or default
    return send_from_directory(media_dir, filename)

# ✅ Standard pattern for listing available files
@plugin_bp.route("/api/plugins/{id}/media/list")
@login_required
@require_permission("api.media_proxy")
def list_media():
    media_dir = get_media_dir()
    files = [f for f in os.listdir(media_dir) if f.endswith(".mp3")] if os.path.exists(media_dir) else []
    return jsonify(files)
```

> [!WARNING]
> Never use `send_file(absolute_path)` directly — it is **vulnerable to path traversal attacks**. Always use `send_from_directory(directory, filename)` and validate the filename first.

### 3-5. Backend External HTTP Request Rules

> [!IMPORTANT]
> **`csp_domains` is for the browser (frontend) ONLY.** Python backend code (`router.py`, `*_service.py`) using `requests.get()` is completely unrelated to the AEGIS permission system or CSP. Backend crawling and external API calls require no special AEGIS permission.

| Scenario | CSP Registration Required | AEGIS Permission Required |
|---|---|---|
| Frontend (JS) calling external API (`fetch`) | **✅ Yes** (register in `csp_domains`) | N/A |
| Backend (Python) crawling an external URL (`requests`) | **❌ No** | **❌ No** |
| Backend fetching an image to display in the frontend | **✅ Yes** (register image domain) | N/A |

```python
# ✅ Backend crawling - No AEGIS permission or CSP needed
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

For services that maintain connections between requests — such as **IMAP, SMTP, WebSocket, or database connections** — the simple stateless approach in `§3-5` is insufficient. These must be managed as a **singleton with a timeout/reconnection guard** inside the `*_service.py` class.

> [!WARNING]
> A singleton connection without a reconnection guard will silently fail after a server-side timeout (typically 30 minutes). **Always include a `try/except` + reconnect block.**

**Standard Pattern (IMAP Example):**
```python
import imaplib
from utils import load_json_config, save_json_config

class EmailService:
    _conn = None  # Singleton connection object

    @classmethod
    def _get_conn(cls, host, user, password):
        """Returns a live connection, reconnecting if timed out."""
        try:
            # ✅ Liveness check: NOOP command confirms connection is alive
            if cls._conn:
                cls._conn.noop()
        except Exception:
            cls._conn = None  # Discard dead connection

        if cls._conn is None:
            # ✅ Establish new connection (SSL required)
            cls._conn = imaplib.IMAP4_SSL(host)
            cls._conn.login(user, password)
        return cls._conn

    @classmethod
    def check_new_emails(cls, config: dict) -> dict:
        """Check for new emails and return status."""
        try:
            conn = cls._get_conn(
                config.get("imap_host"),
                config.get("email"),
                config.get("app_password")  # Use Gmail App Password or OAuth2 token
            )
            conn.select("INBOX")
            last_uid = config.get("last_uid", "0")
            _, data = conn.uid("search", None, f"UID {last_uid}:*")
            uids = data[0].split()
            new_mails = [u for u in uids if int(u) > int(last_uid)]
            return {"new_count": len(new_mails), "uids": [u.decode() for u in new_mails]}
        except Exception as e:
            cls._conn = None  # ✅ Always reset connection on error
            return {"new_count": 0, "error": str(e)}
```

**Connection Type Reference:**
| Connection Type | Recommended Approach | Notes |
|---|---|---|
| IMAP (email read) | Singleton + NOOP liveness check | SSL required; use App Password |
| SMTP (email send) | Connect, send, disconnect per request | No need to maintain long-lived connection |
| WebSocket | Singleton + ping/pong liveness check | Implement reconnect with backoff |
| SQLite/JSON | Use `utils.save_json_config` | No persistent connection needed |

---

## 🔄 5. Backend → Frontend Communication (Polling Architecture)

> [!IMPORTANT]
> **Context API methods like `context.speak()` are JavaScript (frontend) ONLY.** Attempting to call them from Python backend code will immediately raise a `NameError`. To notify the user of a backend event (e.g., new content detected), you MUST use the **frontend polling pattern**.

### Standard Polling Pattern (The Correct Way)
```
[Python Backend]           [JS Frontend (widget.js)]
   Crawl & detect     ←── setInterval (e.g., every 60 sec)
   Save state to JSON    ──→ Fetch /api/plugins/{id}/status
   (save_json_config)       Receive response, check "changed"
                            On change: call context.speak() ✅
```

```python
# ✅ router.py: Backend only manages and returns state
@plugin_bp.route("/api/plugins/{id}/status")
@login_required
def get_status():
    status = load_json_config(STATUS_PATH)
    return jsonify(status)  # e.g., {"changed": true, "summary": "New post: ..."}
```

```javascript
// ✅ widget.js: Frontend polls and triggers notification
const check = async () => {
    const res = await fetch('/api/plugins/{id}/status');
    const data = await res.json();
    if (data.changed) {
        context.speak(`New content detected: ${data.summary}`);
        context.triggerReaction('MOTION', { alias: 'alert' });
    }
};
this.timer = setInterval(check, 60000); // Poll every 60 seconds
```

```python
# ❌ FORBIDDEN: Never try to call context.speak() from Python
# context.speak("New content!")  → NameError: context is not defined
```

---

## 🧬 4. Exports Declaration Standards (Condition Watch)

To allow the scheduler and third-party programs to monitor sensor values and interact with the widget, interfaces must be declared in the `exports` field of `manifest.json`.

### 4-1. `exports.sensors` Array Model
Sensors exist to create criteria for "alerts/reactions when thresholds are reached."
| Parameter | Type | Description | Example |
|---|---|---|---|
| `id` | String | Unique key for the sensor | `"indoor_temp"` |
| `name` | String | User-friendly name displayed in the GUI | `"Indoor Temperature"` |
| `unit` | String | Unit of measurement | `"°C"`, `"%"` |
| `type` | String | Raw data type for comparison | `"number"`, `"string"`, `"boolean"` |
| `endpoint` | String | API address for the scheduler to poll | `"/api/plugins/my-plugin/data"` |
| `field` | String | JSON key to parse from the `endpoint` response | `"main_temperature"` |

### 4-2. `exports.commands` Array Model
Provides command guidelines for handling the plugin via terminal without UI, appearing in the system editor dropdown.
| Parameter | Type | Description | Example |
|---|---|---|---|
| `prefix` | String | Command trigger keyword | `"/ns"` |
| `name` | String | One-line description of the command | `"Notion Workspace Control"` |
| `examples` | [String] | (Optional) Correct usage examples | `["/ns clean", "/ns switch @work"]` |

---
*💡 This document is the most accurate architectural agreement between AEGIS developers and system AI agents. Always refer to this before implementing new plugins or features.*
