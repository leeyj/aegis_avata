# AEGIS Plugin-X: Extension Module Development Guide (v1.9)

AEGIS Plugin-X is a next-generation architecture that manages all dashboard widgets and features as **completely independent modules**. This guide explains the latest **v1.9 standards (including Environment Control)**, and all AI agents and developers must strictly adhere to these policies.

---

## 📌 0. Core Plugin-X Policies (Must Read)

### 0-1. Architectural Vision: Complete Independent Modularity
The goal of Plugin-X is for each plugin to operate as an independent module physically separated from the main system. Plugins should extend or remove features simply by adding or deleting folders, without modifying the core code (e.g., `app_factory.py`, `index.html`, `static/js/`).

### 0-2. Hard Rules (⛔ DO NOT VIOLATE)
1. **No Logic in Core Folders**: Never write plugin logic in `/static/js/widgets/` or `/services/`. This creates dependencies that break the core when a module is removed.
2. **Unique Service Filenames**: Never name your service file `service.py`. Use `{plugin_id}_service.py` to prevent Python namespace conflicts.
3. **Standard Routing Paths**: All backend routes must have the `/api/plugins/[id]/` prefix. Otherwise, the security system (`plugin_security_service`) will fail to identify the plugin and bypass permission checks.
4. **Utility Standard & Relative Imports**: 
   - Never use absolute imports like `import service` in `router.py`. Use relative imports.
   - **Mandatory**: Use the system's `utils.py` for file I/O instead of native `json.load`.
5. **No Script Injection in Main HTML**: Never load global objects via `<script>` tags in `index.html`. All logic must be contained within `widget.js`.
6. **Request Context Guard**: Avoid referencing Flask `request` or `session` objects outside of the `init()` scope in `widget.js` to prevent `RuntimeError: Working outside of request context` during blueprint discovery.

### 0-3. Soft Rules (✅ RECOMMENDATIONS)
- Mediate all inter-plugin communication through the **`context` API** (Capability Proxy).
- If global variables are necessary, register them inside `init()` and clear them in `destroy()`.
- Use `context.registerCommand()` for terminal command handlers rather than creating separate JS files.

---

## 🏗️ 1. Standard Plugin Structure
Plugins are stored in the `/plugins` directory.
```text
/plugins/[plugin-id]/
├── __init__.py               # Required (empty file for package declaration)
├── manifest.json             # Required (metadata, permissions, CSP, exports)
├── config.json               # Optional (local settings)
├── router.py                 # Optional (Flask Blueprint)
├── {plugin_id}_service.py    # Optional (Business logic with naming convention)
└── assets/                   # Frontend assets
    ├── widget.html           # HTML snippet (Shadow DOM injection)
    ├── widget.js             # Logic module (Init/Destroy + command handlers)
    └── widget.css            # Stylesheet (Shadow DOM isolation)
```

---

## 🛠️ 1.1 Backend Utility API (`utils.py`)
To ensure consistency and safety (atomic writes, encoding), use these core utilities:

| Function | Params | Return | Description |
|---|---|---|---|
| `load_json_config(path)` | `path` (str) | `dict` | Safely loads JSON with `utf-8-sig`. Returns `{}` if file missing. |
| `save_json_config(path, data, merge=True)` | `path`, `data`, `merge` | `bool` | Atomic save. If `merge=True`, updates existing data. |
| `clean_ai_text(text)` | `text` (str) | `str` | Strips markdown wrappers (```json) and AI labels. |

---

## 📜 2. manifest.json Specification (v1.7+)
Defines identity, security (CSP), and backend entry points.

### Key Fields:
- `id`: Unique plugin ID (must match the folder name).
- `permissions`: List of system permissions (e.g., `api.notion`, `ENVIRONMENT_CONTROL`).
- `csp_domains`: List of external domains for CSP whitelisting.
- `exports.sensors`: Data points for automatic scheduler monitoring.
- `exports.commands`: Terminal commands for GUI dropdowns.

---

## 🧩 3. Frontend: Runtime Environment (Capability Proxy)
Widgets are initialized via `init(shadowRoot, context)`.

### Context API Highlights:
- `context.speak(text)`: TTS output with lip-sync.
- `context.environment.applyEffect(type)`: Trigger RAINY, SNOWY, STORM, or CLEAR effects.
- `context.triggerReaction(type, data)`: Animate the avatar using Aliases.
- `context.registerCommand(prefix, callback)`: Define custom terminal commands.

---

## �️ 3.5 Backend Namespace Isolation (Critical)
Because the PluginLoader dynamically loads all plugins into memory, namespace collisions are a severe source of errors.

1. **Strict Plugin Isolation**: You **MUST NOT** directly `import` a Python module (e.g., `xxx_service.py`) from another plugin. All cross-plugin data fetching should be handled through frontend `fetch()` or `context.askAI`.
2. **Use Explicit Relative Imports**: When organizing your own backend files, avoid absolute imports that might collide with other plugins.
   - ❌ **Wrong**: `import my_service` (may clash if another plugin has `my_service.py`).
   - ✅ **Correct**: `from . import my_service` or `from .my_service import MyService`.

---

## 🛡️ 4. Security, Lifecycle & Design
### 4.1 Frontend Widget Lifecycle & DOM Limits
Understanding when your widget is rendered and destroyed is crucial:
1. **Injection**: `assets/widget.html` is injected via `shadowRoot.innerHTML`. 
   - ⛔ **WARNING**: Because it uses `innerHTML`, any `<script>` tags inside `widget.html` **will NOT execute**. Put all logic in `widget.js`.
   - ⛔ **WARNING**: You cannot use the `<slot>` API. Traverse DOM only via `shadowRoot.querySelector()`.
2. **Init**: The loader calls `init(shadowRoot, context)` exactly once per dashboard load.
3. **Destroy**: The loader calls `destroy()` when the widget is removed. 

### 4.2 Resource Cleanup (Memory Leak Prevention)
- Always clear `setInterval`, `setTimeout`, and event listeners in the `destroy()` function. Failing to do so will result in silent memory leaks when the user closes the widget.

### 4.3 Content Security Policy (CSP) Details
- **No Implicit Fetching**: Any external resource (API, image) not listed in `csp_domains` inside `manifest.json` will be blocked by the browser.
- **Domain Format**: 
  - Always include the protocol scheme: `["https://api.github.com", "https://*.example.com"]`.
  - Avoid using base64 `data:` URIs or `blob:` blobs for images, as the default strict CSP blocks them to prevent XSS.

### 4.4 Global UI Design Consistency
- **CSS Isolation**: All styles are encapsulated within the Shadow DOM. Use system CSS variables (e.g., `--neon`, `--glass`) for visual consistency.

---

## ⏰ 5. Scheduler Integration (v1.8)
Plugins can register routines without modifying core scheduler code by using:
1. **`terminal_command`**: Execute any command registered via `context.registerCommand()`.
2. **`api_call`**: Directly call a backend API endpoint.
3. **`Condition Watch`**: Trigger routines based on real-time data from `exports.sensors`.

---
**AEGIS Plugin-X Standard v1.8 Documentation**
*Core Principle: Never force the user to edit JSON directly. Use GUI-driven configurations via manifest exports.*
