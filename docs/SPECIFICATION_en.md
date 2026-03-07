# AEGIS Intelligence - Integrated System Specification (SPECIFICATION)

**Last Updated: 2026-03-07 (v3.4.0 Global Standard)**
This document defines the core backend/frontend design principles and system specifications of the AEGIS dashboard.

---

## 🏗️ 1. Core Architecture Design Principles

### 1.1 Strict Isolation
- Use **Shadow DOM** and **JS Capability Proxy** to ensure that widget errors do not paralyze the main system.
- Physically block CSS overflows or global script variable pollution from individual widgets.
- **Interaction Safety**: Enforce `stopPropagation()` on interactive elements to prevent widget dragging/ghost-clicking issues.

### 1.2 Resource Proxy
- Plugins cannot directly access the file system or AI API keys.
- All resource usage is mediated through the secure **AegisContext (Capability Proxy)** provided by the system.

### 1.3 Universal Lifecycle
- All modules must comply with the `init(shadowRoot, context)` and `destroy()` standard lifecycle specifications.

### 1.4 No JSON Editing
- Users should not be forced to manually edit JSON configuration files. All settings are provided via GUI.

### 1.5 Utility & Registry Standards
- **utils.py Mandatory**: Plugins must use `load_json_config` and `save_json_config` for file I/O.
- **Context Registry**: Adhere to the `register_context_provider` interface to feed plugin data into the AI.

### 1.6 Pure Isolation Principle
- Directly importing another plugin's module is **strictly prohibited**.

### 1.7 AI Response & Command Standardization (v3.4.0)
- **Universal Routing**: All messaging interfaces (Web, Discord, etc.) are unified through the `BotManager`.
- **Unified Command Symbols**:
    - **`/@` (Hybrid)**: Intelligent responses combining local context with external web search.
    - **`/` (Local)**: Strictly restricted reports using only local widget context.
    - **`/#` (Search)**: Pure real-time web search without system context.
- **I18n System Prompts**: System personas and instructions are dynamically loaded via `utils.get_i18n()` based on the user's language setting.

---

## 🧩 2. Plugin-X Platform Standards

### 2.1 Dynamic Loading
- `static/js/plugin_loader.js` scans the `/plugins` folder and injects assets dynamically.
- **AXC (AEGIS Extreme Cache)**: Uses IndexedDB to cache plugin assets, ensuring instant booting.

### 2.2 Security & Permissions
- **Dynamic CSP Engine**: White-lists domains in `manifest.json` automatically.
- **API Guard**: Blocks unauthorized API calls via decorators.

### 2.3 Exports (v1.8)
- Plugins expose `sensors[]` and `commands[]` to the system for routine integration.

---

## 🛠️ 3. Intelligent Services & Automation

### 3.1 Briefing Scheduler
- Operates on a polling loop or event-based trigger.
- Supports **Condition Watch**, which triggers routines based on data thresholds (sensor values).

### 3.2 AI Analysis Hub
- **Multi-Model Support**: Dynamically switch between Gemini, Grok, and local Ollama models.
- **Response Formatting**: Cleanly parses `display` and `briefing` tags for the HUD.

### 3.3 Messaging Brain & Adapters (v3.4.0) ✨NEW
- **BotManager Hub**: The central brain for all messaging platform integrations.
- **Loose Coupling Adapters**: Extensible `BotAdapter` interface for adding Discord, Telegram, or other bots without core modifications.
- **Action Sync**: Automatically triggers plugin handlers like `SET_ALARM` when the AI emits specific action tags.

---

## 🌐 4. External Interfaces & Data Formats

- **Persistence Master**: `config/settings.json` is the single source of truth for runtime configurations.
- **Safe I18n**: Multi-language support for both the UI and AI system prompts.

---
*Refer to `docs/for_developer/Plugin-X_Guide.md` for detailed development methodology.*
