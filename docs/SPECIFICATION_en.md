# AEGIS Intelligence - Unified System Specification (SPECIFICATION)

**Last Updated: 2026-03-08 (v3.7.0 Global Standard)**
This document defines the core backend/frontend design principles and system specifications for the AEGIS dashboard.

---

## 🏗️ 1. Core Architecture Design Principles (Design Principles)

### 1.1 Strict Isolation
- Uses **Shadow DOM** and **JS Capability Proxy** to ensure widget failures do not paralyze the main system.
- Physically prevents CSS overflows or global variable pollution from specific widgets.
- **Interaction Isolation**: Enforces a `Propagation Stop` policy and `Interactive Class` whitelist (`.no-drag`, `.interactive`, etc.) to prevent widget clicks from propagating to container drag events.

### 1.2 Resource Proxy
- Plugins cannot directly access the file system or AI API keys.
- All resource usage is mediated through the secure **AegisContext (Capability Proxy)** provided by the system.

### 1.3 Universal Lifecycle
- All modules must comply with standard lifecycle specifications: `init(shadowRoot, context)` and `destroy()`, allowing the system to control resources efficiently.

### 1.4 No JSON Editing (v1.8 Principle)
- Users are never forced to edit JSON configuration files directly.
- All settings are provided via GUI; developers expose data/commands through the `exports` field in `manifest.json`.

### 1.5 Standard Utilities & Registry (v1.9)
- **Mandatory utils.py**: Plugins must use system-guaranteed utilities like `load_json_config` and `save_json_config` instead of custom I/O.
- **Context Registry**: Plugins must follow the standard interface for injecting state data into the briefing engine via `register_context_provider`. (Signature: `callable -> str/dict`)

### 1.6 Pure Isolation
- Directly importing Python modules from other plugins (e.g., `import xxx_service`) is **strictly prohibited under any circumstances**.
- Inter-plugin communication must be resolved at runtime through system-provided indirect APIs (e.g., `exports` in `manifest.json` and `context.askAI`).

### 1.7 AI Response & Command Standardization (v3.7.0) ✨UPDATED
- **Universal Routing**: All messaging interfaces are processed centrally through `BotManager`.
- **Unified Command Symbols & Priority (v3.7.0)**:
    1.  **System Commands**: `/config`, `/help`, etc. (System-level control).
    2.  **Deterministic Actions (v3.7.0)**: `/play`, `/alarm`, etc. Defined in the manifest; executes immediately without AI reasoning.
    3.  **`/@` (Hybrid)**: AI answers combining local context and external search.
    4.  **`/` (Local)**: AI reports focused solely on local widget data (external search blocked).
    5.  **`/#` (Search)**: Pure external real-time search without system context.
- **I18n System Prompts**: Personas and instructions are loaded dynamically based on the system's `lang` setting from `config/i18n/`.

### 1.8 Terminal Alias Auto-Sync (v2.2-v3.3)
- If a plugin registers `aliases=['news', 'weather']` in `register_context_provider`, the frontend `CommandRouter` automatically synchronizes these at startup.
- **Canonical Routing**: Typing `/news` in the terminal translates to its target ID, and `BotManager` collects the data.
- **De-hardcoding**: All aliases are managed centrally in the backend, supporting multi-language (Korean/English) synonyms.

### 1.9 Selective Briefing & Scalability (v2.3 Principle)
- **User Intent over Visibility**: Briefings prioritize data from widgets explicitly selected by the user, not just currently visible ones.
- **Data Filtering**: `DataService.collect_all_context(plugin_ids)` minimizes AI token costs and improves analysis quality by collecting only necessary data.
- **Config Persistence**: Plugins must have a standard REST interface for saving settings, which the system persists in `config.json`.

### 1.10 AXC (AEGIS Extreme Cache) & Instant Boot (v2.4.5 Principle)
- **Asset Bundling**: Core assets are pre-serialized into an `init_pack` (single JSON) to minimize network overhead.
- **Local Caching (AXC)**: Uses browser **IndexedDB** for permanent storage. Instant boot (<10ms) is triggered if the SHA256 hash matches the server.
- **Parallel Hydration**: 20+ plugins are initialized in parallel using `Promise.all`, reducing total load time to the level of the "slowest single plugin."
- **Visual Continuity**: Operates a dedicated HUD for avatar model loading to provide clear system status even during heavy resource loads.

### 1.11 Architecture-First (v2.9.0 Principle)
- **Architecture Priority**: Before modifying any code, one must read `docs/ARCHITECTURE.md` to understand the system design philosophy (Plugin-X, Schema-Driven, Event-Driven).
- **Guaranteed Consistency**: Modifications that do not comply with the data flow and module boundaries specified in the architecture reference will be rejected.

### 1.12 Developer Platform (v2.9.0 Principle)
- **Boilerplate Generator**: The `python create_plugin.py --id {id} --name "{name}"` command automatically generates a compliant plugin skeleton.
- **Single Source of Truth**: All rules, APIs, and schemas are defined in the single document `docs/for_developer/PLUGIN_SPEC.md`; duplicate definitions are prohibited.
- **Quick Onboarding**: Provides an onboarding path to complete the first plugin within 5 minutes via `docs/for_developer/QUICK_START.md`.

---

## 🧩 2. Plugin-X Platform Specifications

### 2.1 Dynamic Loading & Injection
- `static/js/plugin_loader.js` scans the `/plugins` folder at boot and dynamically injects HTML, CSS, and JS assets.
- **Auto-Stagger**: If layout info is missing, the system automatically cascades widgets to avoid overlapping.

### 2.2 Security & Permissions
- **Dynamic CSP Engine**: Whitelisted `csp_domains` from `manifest.json` are reflected in the `Content-Security-Policy` at server boot.
- **API Guard**: Blocks undeclared API calls via the `require_permission` decorator.

### 2.3 Exports & Actions (v3.7.0) ✨UPDATED
- **Exports**: Plugins expose sensor data (`sensors[]`) and commands (`commands[]`) via the `exports` field in `manifest.json`.
- **Actions (v3.7.0)**: Define Action IDs and trigger keywords in `manifest.json` for registration in `BotManager`.
- **`initialize_plugin()`**: Mandatory function for registering backend handlers into the system registry during plugin load.

### 2.4 Environment Capability (v1.9)
- Plugins can request `ENVIRONMENT_CONTROL` permission to control global visual effects.
- **`context.environment.applyEffect(type)`**: Triggers effects like `RAINY`, `SNOWY`, `STORM`, or `CLEAR` in real-time.

### 2.5 UI Drag Lock & Resize Standard
- All widgets are centrally controlled by `ui_drag_manager.js`. In the locked state, mouse dragging and resize handles are disabled.

---

## 🛠️ 3. Intelligence & Automation

### 3.1 Briefing Scheduler
- **Gatekeeper**: Centrally controls widget notification permissions based on time/day.
- **Routines**: Executes automated actions at specified times. Any plugin can be scheduled via `terminal_command` or `api_call`.
- **Conditional Watch (v1.8)**: Supports routines triggered by **data conditions** (sensor thresholds) rather than just time.

### 3.2 AI Analysis Hub (AI Hub v2.1)
- **Multi-Model Support**: Selects the optimal model (Grok, Gemini, Ollama, etc.) for analysis and briefing.
- **Aggressive Text Cleaning**: Strips unnecessary labels and markdown from AI responses via `utils.clean_ai_text()`.

### 3.3 Messaging Brain: BotManager (v3.7.0) ✨UPDATED
- **Centralized Routing Hub**: Receives commands from all platforms (Web, Discord, etc.) and routes them based on priority.
- **Auto-Loading Actions**: Scans `manifest.json` of all active plugins at startup to automatically index deterministic commands.
- **HUD Synchronization (sync_cmd)**: Disseminates backend action results to the frontend UI in real-time.

---
*Refer to `docs/for_developer/Plugin-X_Guide.md` for detailed development methodologies.*
