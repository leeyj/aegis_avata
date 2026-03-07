# AEGIS Plugin-X Framework Reference Guide (v3.4.0)

This document is a comprehensive reference summarizing all available permissions, declarable system resources (Exports), frontend communication standards (Context API), and backend communication standards that developers and AI agents can utilize within the AEGIS Plugin-X (v3.4.0) architecture. v3.4.0 introduces the **Global I18n system** and the **Platform-Agnostic Messaging Hub (BotManager)**.

---

## ⚡ 0. Performance Architecture: AXC (AEGIS Extreme Cache)
Introduced in v2.4.5, **AXC** maximizes plugin boot speed.
- **IndexedDB**: All plugin assets (HTML/JS/CSS) are permanently stored in the browser's IndexedDB.
- **SHA256 Versioning**: If the hash matches the server's, the plugin loads instantly in **under 10ms** without network download.
- **Two-Step Hydration**: Creates DOM structure first, then injects assets in parallel to ensure both speed and layer consistency.

---

## 🔐 1. Plugin-X Security Permissions (Permissions)
To communicate with external environments or access key core systems, a plugin must register the corresponding permission in the `"permissions"` array within `manifest.json`. In the Python backend router, these must be protected with the `@require_permission("...")` decorator.

| Permission ID | Name | Usage Example | Description |
|---|---|---|---|
| `api.google_suite` | Google Workspace | `calendar`, `todo`, `gmail` | Accesses authenticated Google user data (Calendar, Tasks, Gmail). |
| `api.notion` | Notion API Proxy | `notion` | Delegated execution for Notion DB/Page manipulation. |
| `api.media_proxy` | Local Media Access | `mp3-player`, `media` | Accesses local disk media resources (MP3, images) through security isolation. |
| `api.system_stats` | System Resource | `system-stats` | Queries hardware status (CPU, memory, storage). |
| `api.ai_gateway` | AI External Tunnel | `proactive-agent`, `ai` | Proxy communication with AI providers (Gemini, Grok). |
| `api.voice_service` | TTS Control | `proactive-agent`, `speaker`| Directly controls core Edge-TTS and audio playback. |
| `api.io_control` | I/O & Settings | `scheduler` | Write operations on system config, schedules, and IO systems. |
| `api.studio_service` | Live2D Core | `studio` | Full access to avatar models, alias configs, and renderers (Powerful). |
| `ENVIRONMENT_CONTROL` | Global Effects | `weather` | Triggers effects like `RAINY`, `SNOWY`, `STORM`. |

---

## 🔌 2. Frontend Communication: Context API Catalog
All frontend widgets (`widget.js`) must use the **`context` (Capability Proxy) object** injected via `init(shadowRoot, context)`.

> [!IMPORTANT]
> **Event Propagation (v2.3)**: Always call `e.stopPropagation()` for interactive elements. Use `.no-drag`, `.interactive`, or `.clickable` classes for containers.

### 2-1. System Output
| Method Signature | Return Value | Description |
|---|---|---|
| `context.log(message: String)` | `void` | Prints a plugin-tagged log to the developer console. |
| `context.appendLog(tag: String, msg: String)` | `void` | Prints to the 'Common Terminal Log Window' at the bottom. |
| `context.speak(text: String, audioUrl?: String, visualType?: String)`| `void` | Instantly converts text to speech via Edge-TTS with lip-sync. |
| `context.environment.applyEffect(type: String)` | `void` | Triggers global visual effects. (Requires `ENVIRONMENT_CONTROL`) |

### 2-2. Avatar Control (Live2D Controller)
| Method Signature | Return Value | Description |
|---|---|---|
| `context.triggerReaction(type: String, data: Object, timeout?: Number)` | `void` | Controls avatar `"MOTION"` or `"EMOTION"`. e.g., `{ alias: 'joy' }`. |
| `context.playMotion(filename_or_alias: String)` | `void` | Commands the avatar to play a motion/expression. Supports Custom Aliases. |
| `context.changeModel(modelName: String)` | `void` | Changes the avatar character in real-time. |

### 2-3. I/O, I18n, & Net
| Method Signature | Return Value | Description |
|---|---|---|
| `context._t(key: String)` | `String` | Returns translated string based on current language settings. |
| `context.applyI18n()` | `void` | Instantly re-renders `.i18n` elements inside the Shadow DOM. |
| `context.registerCommand(prefix: String, callback: Function)` | `void` | Registers a terminal command handler (e.g., `/weather`). |
| `context.triggerBriefing(feedbackEl: Element, options: Object)` | `void` | Executes comprehensive tactical briefing via AI. |
| `context.askAI(task: String, data: Object)` | `Promise<Object>` | Requests AI intent analysis. Note: voice output is skipped if `--m` is detected. |

### 2-4. `context.registerCommand` Parameter Parsing Convention
Callback receives the **rest of the command string** as `param`.

| Structure | Parsing Example | Result |
|---|---|---|
| Single Value | `cb(param)` | `/play music` → `param = "music"` |
| Subcmd + Arg | `param.trim().split(' ')` | `/obs add file.md` → `["add", "file.md"]` |

```javascript
// ✅ Multi-parameter parsing standard
context.registerCommand('/obs', (param) => {
    const parts = param.trim().split(' ');
    const sub = parts[0];
    const rest = param.slice(sub.length).trim();
    // Logic for subcommands...
});
```

---

## 📡 3. Backend Communication Standards

### 3-1. Endpoint Isolation
All `Blueprint` routes must use the prefix `/api/plugins/{your_plugin_id}/...`. Bypassing this will result in 403 Forbidden.

### 3-2. Backend Briefing Engine & Multi-Alias Support (`services.plugin_registry`)
- **Signature**: `register_context_provider(plugin_id: str, provider_func: callable, aliases: list = None)`
- **Multi-Alias Support (v2.8+)**: 
  - Register aliases like `aliases=['Schedule', 'Routine']`.
  - At startup, these are synced to the frontend `CommandRouter`.
  - Entering `/Schedule` routes to `/your-plugin-id`.
  - **Required**: `widget.js` must have `context.registerCommand('/your-plugin-id', callback)`.

---

## 🛠️ 4. Data Service & Selective Context ✨NEW

### 4-1. `DataService.collect_all_context` (Python)
- **Signature**: `collect_all_context(plugin_ids: list = None) -> dict`
- **Description**: Collects context from active plugins. Used for AI briefing to limit context size.

### 4-2. Config Persistence Standard API Pattern
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

## 🤖 5. AI Service & Prompt Specifications ✨NEW

### 5-1. Prompt Synchronization (`prompts.json`)
Agent personas are no longer hardcoded. `services/gemini_service.py` loads `prompts.json` and replaces:
- `{{current_time}}`: Server time in 24h format.
- `{{modules}}`: List of active Plugin-X modules.

### 5-2. AI Response Refinement & Action Sync (v3.4.0)
The backend processes AI responses via `utils.clean_ai_text()`:
1. Strips markdown wrappers (` ```json `).
2. Filters labels (`[DISPLAY]`, `AEGIS:`).
3. **Action Detection**: If a tag like `[ACTION] SET_ALARM` is found, the `BotManager` interprets it and triggers the corresponding plugin handler.
4. **I18n Persona**: Dynamic persona instructions injected via `utils.get_i18n()` based on user language.

---

## 📂 7. Media Serving Patterns (Security)
If using `api.media_proxy`, follow these security standards to avoid path traversal attacks.

**Standard Directory Convention:**
| Media Type | Server Path | Description |
|---|---|---|
| MP3 / Audio | `static/media/mp3/` | Standard path for audio files. |
| Images | `static/media/images/` | Backgrounds, etc. |

**Security Pattern (`router.py`):**
```python
from flask import send_from_directory
# ✅ Use send_from_directory to prevent directory traversal
@plugin_bp.route("/api/plugins/{id}/media/stream/<filename>")
@login_required
@require_permission("api.media_proxy")
def stream_media(filename):
    if ".." in filename or filename.startswith("/"):
        return jsonify({"error": "Invalid filename"}), 400
    media_dir = get_media_dir()
    return send_from_directory(media_dir, filename)
```

---

## 🔗 8. Persistent Connection Services (Persistence Patterns)
For services like IMAP, WebSocket, or DB connections, use a **Singleton + Keepalive** pattern in `*_service.py`.

> [!WARNING]
> Connections can timeout (usually 30 mins). Always implement a reconnect logic using `ping` or `noop`.

```python
class EmailService:
    _conn = None
    @classmethod
    def _get_conn(cls, config):
        try:
            if cls._conn: cls._conn.noop()
        except:
            cls._conn = None
        if cls._conn is None:
            # Reconnect logic here...
            pass
        return cls._conn
```

---

## 🔄 9. Backend-to-Frontend Communication (Polling Architecture)
**Context APIs like `context.speak()` are Frontend-only (JS).** To notify a user from the backend, use the **Polling Pattern**.

1. **Backend**: Saves state to `status.json`.
2. **Frontend**: Calls `/api/plugins/{id}/status` every 60s via `setInterval`.
3. **Frontend**: If state changed, calls `context.speak()`.

---

## 🧬 10. Exports Declaration Spec (Condition Watch)
Define interfaces in `manifest.json > exports` so the scheduler can monitor data thresholds.

### 10-1. `exports.sensors`
Used for triggering routines based on values (e.g., "Alert if CPU > 90%").
| Key | Type | Description |
|---|---|---|
| `endpoint` | String | API path for the scheduler to poll. |
| `field` | String | JSON key to extract the value from. |
| `type` | String | `number`, `string`, or `boolean`. |

### 10-2. `exports.commands`
Exposes terminal commands to the GUI dropdown for scheduling.
- `prefix`: `/ha`
- `name`: "Home Assist Control"

---

## 🧠 11. Unified Messaging Intelligence (BotManager) ✨NEW
v3.4.0 introduces **BotManager** to unify commands across Web and Discord.

### 11-1. Unified Command Symbols
| Symbol | Mode | Logic |
|---|---|---|
| **`/@`** | **Hybrid** | Local widget context + external search for deductive reasoning. |
| **`/`** | **Local** | Strictly local system data only. Used for secure reporting. |
| **`/#`** | **Search** | Pure external search for public info (Google Search tool). |

### 11-2. Platform-Agnostic BotAdapter
- **Inheritance**: Inherit from `BotAdapter` to implement `send_text` and `send_image`.
- **Loose Coupling**: `BotManager` interacts via standardized message objects.

---
*💡 This document is the most accurate architectural agreement between AEGIS developers and system AI agents. Always refer to this before implementation.*
