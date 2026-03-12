# AEGIS Intelligence - Update Log (UPDATE LOG)

## [v3.7.0] Deterministic Control & Centralized Routing (2026-03-08)

### 🚀 Core Updates

1. **Introduction of Deterministic Actions**
   - Established a system that performs immediate functions through clear keyword mapping, bypassing the AI intent identification stage.
   - Implemented deterministic action handlers for all plugins (e.g., `alarm`, `todo`, `music`, `calendar`) to maximize system reliability.
   - Supports Korean, English, and shortcut commands (e.g., `/play`, `/alarm`, `/todo`).

2. **BotManager Centralized Routing & Auto Action Loading**
   - Centralized message processing from all platforms (Web Terminal, Discord, etc.) through `BotManager`.
   - Added functionality to automatically index and register deterministic actions by scanning `manifest.json` of all active plugins at startup.
   - **Command Priority**: System Core Commands > Deterministic Actions > AI Hybrid (@) > External Search (#) > AI Natural Language.

3. **HUD Real-time Synchronization (`sync_cmd`) Mechanism**
   - Introduced a shared event system that immediately refreshes the frontend dashboard UI after a backend action (e.g., adding an alarm, changing a song) is performed.
   - Significantly improved user experience by updating the UI simultaneously with command execution, removing polling wait times.

4. **Plugin Initialization Standardization (`initialize_plugin`)**
   - Standardized the `initialize_plugin()` function within each plugin's `router.py` to centrally manage action registration and context provider settings.

5. **Comprehensive Revision of System Architecture & Developer Docs**
   - Updated `ROADMAP`, `ARCHITECTURE`, `FRAMEWORK_REFERENCE`, `Plugin-X_Guide`, `SPECIFICATION`, and `AI_AGENT_PROMPT` to comply with v3.7.0 standards.

---

## [v3.4.6] Dual Response & Voice Briefing Stability (2026-03-08)

### 🚀 Core Updates

1. **Establishment of Dual Response ([DISPLAY]/[VOICE]) Standards**
   - Applied a system-wide guideline to clearly separate AI responses into visual details (`[DISPLAY]`) and voice summaries (`[VOICE]`).
   - Added the `dual_response_instruction` to `config/i18n/ko.json` to ensure consistent voice briefing quality across all platforms.

2. **Advanced BotManager AI Communication Logic**
   - Modified `services/bot_gateway.py` to enforce dual response rules even for AI queries via external channels (e.g., Discord).
   - Prevented malfunctions caused by markdown links or complex symbols being sent to the TTS engine.

3. **Improved HUD Interaction & UI Alignment**
   - Removed internal system prompts from user input values displayed in the HUD chat bubbles, showing only the actual question text.

---

## [v3.4.5] Universal Connectivity & Interaction (2026-03-07)

### 🚀 Core Updates

1. **Localization of External Library Assets (Local Assets)**
   - Localized `Socket.IO` and `MarkedJS` libraries to be served directly from the server instead of CDNs.
2. **Intelligent Network Settings via `settings.json`**
   - Introduced the `ProxyFix` switch and custom CSP whitelist management.
3. **Avatar Interaction Enhancements (Hit Area Interaction)**
   - Added hit area detection for Live2D models (Head, Body). Actions like 'joy' or 'touch_body' are triggered on click.
   - Added `window.toggleHitFrames()` for developers.

---

## [v3.4.0] Global I18n & Unified Command System (2026-03-07)

### 🚀 Core Updates

1. **Global Internationalization (I18n) Support System**
   - Decoupled all hardcoded prompts into language-specific files (`config/i18n/`). AI personas and system instructions now change dynamically based on the user's `lang` setting.
2. **Unified Command Routing System (v3.3.x Integration)**
   - **`/@` (Hybrid)**: Intelligent response combining local data + external search.
   - **`/` (Local)**: Precise reporting using only system data (External search blocked).
   - **`/#` (Search)**: Pure external real-time search without context.
3. **Discord Bot Adapter Architecture**
   - Implemented the Discord linkage module based on the platform-independent `BotAdapter` class.

---

## [v2.4.5] AXC (AEGIS Extreme Cache) & Instant Boot (2026-03-04)

### 🚀 Core Updates

1. **AXC (AEGIS Extreme Cache) System**
   - Utilizes browser **IndexedDB** to aggressively cache all plugin sources locally. Instant Boot (<10ms) is achieved by comparing SHA256 hashes with the server.
2. **Parallel Hybrid Loading**
   - Refactored plugin loading to a `Promise.all` based parallel approach, removing the sequential loading bottleneck.
3. **Avatar Loading HUD**
   - Added a dedicated scanning HUD displaying "AVATAR UNIT LOADING..." during heavy Live2D resource loads.

---

## [v2.0.0] Full Adoption of Plugin-X & Shadow DOM Isolation (2026-03-02)

- Complete migration of core widgets (Terminal, Search) to the Plugin-X architecture.
- Prevented style/script conflicts via Shadow DOM encapsulation.

---
*Refer to the Korean documentation for full logs before v2.0.0.*
