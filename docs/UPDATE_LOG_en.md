# AEGIS Intelligence - UPDATE LOG

## [v3.4.0] Global I18n & Unified Command System (2026-03-07)

### 🚀 Core Updates

1. **Global Multi-language (I18n) Framework**
   - Decoupled all hardcoded backend prompts in `BotManager` into language configuration files (`config/i18n/`).
   - Introduced the `utils.get_i18n()` function to dynamically change AI persona and system instructions based on user language settings.
   - Comprehensive system prompt localization for both Korean and English.

2. **Unified Command Routing System (Integrated v3.3.x)**
   - Unified inputs from all platforms, including Web Terminal and Discord, into the `BotManager`.
   - **`/@` (Hybrid):** Intelligent responses combining local data with external search.
   - **`/` (Local):** Precision reporting based strictly on system data, with external search disabled.
   - **`/#` (Search):** Pure real-time external search without system context.

3. **Discord Bot Adapter Architecture**
   - Implemented a Discord integration module based on the platform-independent `BotAdapter` class.
   - Adopted a 'Loose Coupling' structure, facilitating future expansion to other platforms like Telegram.

4. **Alarm Plugin Synchronization & Bug Fixes**
   - Standardized the Alarm list API (`/api/plugins/alarm/list`) response format, resolving integration issues with the dashboard widget.
   - Enhanced the `BotManager` handler to accurately process AI-generated alarm actions (`[ACTION] SET_ALARM`).

## [v3.1.5] YouTube Music Auth Automation & Deployment Optimization (2026-03-06)

### 🚀 Core Updates

1. **YouTube Music Authentication Automation System**
   - **Smart Parsing Engine:** Implemented a feature that automatically extracts `Cookie` and `Authorization` information to update authentication files when a user pastes a `cURL` command or a block of `Raw Headers` from a browser. (`ytmusic_service.py`)
   - **Integrated Widget Button (🔑):** Added an authentication renewal button directly to the YouTube Music widget, allowing users to update credentials instantly within the dashboard without leaving the site.
   - **Multi-language (i18n) Support:** Applied Korean and English guides and notification messages throughout the process to assist international users.

2. **Deployment Process Optimization (`deploy.py`)**
   - **Large File Exclusion:** Added `models` and `test_models` folders to the exclusion list (`EXCLUDE`) to significantly improve upload speeds (by over 90%) during deployment.
   - **Remote Auto-build:** Stabilized the pipeline that automatically builds security modules (`.so`) and restarts the environment during home server deployment.

3. **System Stability & Lint Refinement**
   - Completely resolved static analysis errors in `ytmusic_service.py` by fixing duplicate imports, unused variables, and unnecessary f-strings.
   - Adopted a server-side proxy method for authentication renewal to prevent browser security policy (Mixed Content) issues.

## [v3.1.0] Studio Preview & Active Hardening (2026-03-05)

### 🚀 Core Updates

1. **Introduction of Studio Preview Mode**
   - Opened the Live2D Studio, previously exclusive to sponsors, to all users in a preview mode.
   - **UI Differentiation:** Displays a blue "Preview" badge for non-sponsor connections and highlights only `idle` and `dance` actions to emphasize features.
   - **Limited Usage:** Locked premium emotions/actions (Gray/Locked) and restricted manual editing of `alias.json` (`readonly`) to encourage sponsorship.

2. **Security Logic Binary Conversion & Verification Enhancement**
   - Completely separated core sponsor check logic into `core_security.py` and increased anti-forgery levels by including an **Identity (User identifier)** in the hash algorithm.
   - Updated local (`secrets.json`) and server sponsor keys to the new security standard (`...-E2BAB342`).
   - Enhanced `build_security_win.bat` to allow 1-Click compilation in Windows environments.

3. **Git Repository Asset Optimization (Cleanup)**
   - Removed temporary files (`tmp...`), backup files (`.bak`), and audio caches (`*.mp3`, `*.txt`) from the tracking list and physically deleted them to lighten the repository.
   - Implemented a whitelist-based security policy that tracks only binaries (`.pyd`, `.so`) and hides source files (`.py`, `.c`).

## [v3.0.0 Alpha] Core Hardening & Binary Shield (2026-03-05)

### 🚀 Core Updates

1. **Binary Shield Introduction (Sponsorship Protection)**
   - Separated core security logic `is_sponsor` and Salt values into `core_security.py`.
   - Utilized Cython to compile the module into machine code (.pyd / .so), ensuring core assets are protected even if the source code is exposed.
   - Established a pipeline (`setup_security.py`, `remote_build_linux.py`) for automatic building and verification in both Windows (MSVC) and Linux (GCC) environments.

2. **Integrated Secure Launcher (`run_aegis.bat`) & Automation Tool Development**
   - **run_aegis.bat:** Introduced an integrated launcher that checks for security binaries during local execution and prompts on-the-spot compilation if necessary.
   - **deploy.py (Hardening Integration):** Implemented a 'Zero-Source' deployment method that automatically builds Linux binaries during server deployment, downloads the generated `.so` file locally, and deletes the source on the server.
   - **.gitignore Hardening:** Strengthened rules to block core source files (`.py`, `.c`) from being exposed to Git and track only compiled binaries (`.pyd`, `.so`).

3. **Security Planning & Worst-Case Scenario Analysis**
   - Established 'Zero-Trust UI' and 'Import Level Security' strategies to strengthen isolation between widgets.
   - Finalized the roadmap for API key protection and system authority control via `core_security_hardening_plan.md`.

## [v2.9.5] Funny Plugin & System Stability (2026-03-05)

### 🚀 Core Updates

1. **(Zero Cost) New 'Markov Chain' Plugin Development**
   - Added a local Markov Chain-based text generation plugin for light interaction with the avatar.
   - **Zero-Cost:** Completely eliminates token costs by generating random sentences on the browser side without AI API calls.
   - **Interactive Poke:** Implemented physical interaction triggered when the avatar (Live2D canvas) is clicked 3 times consecutively (Poke).
   - Injected over 100 high-density corpora including 2024-2025 latest memes, comedy show lines, and developer humor to ensure generation quality.

3. **Login Redirection (`next`) & System Stability Reinforcement**
   - Resolved a bug where users were not returned to the previous page after a successful login using the `next` parameter.
   - Optimized the server restart process to prevent loading delays caused by hash mismatches between server in-memory cache (`init_pack`) and browser AXC (IndexedDB).

---

## [v2.9.0] Architecture Documentation & Developer Platform (2026-03-05)

### 🚀 Core Updates

1. **Official System Architecture Documentation (`ARCHITECTURE.md`)**
   * Authored a new comprehensive reference including High-Level Architecture diagrams (Mermaid) for the entire system.
   * Visualized component interaction sequences (initialization, AI query processing) with Mermaid and officially documented 8 design compliance rules.

2. **Root Cause Resolution for Gemini API 400 Errors**
   * Forced `tools=[]` injection during structured JSON output (`response_schema`) requests to fundamentally block 400 errors caused by Search attribute conflicts. (`services/gemini_service.py`)

3. **TTS `speechText` Parameter Standardization**
   * Fixed logic for passing `speechText` (pure text without markdown) during TTS calls in `ai_gateway.js` and standardized audio playback parameters for the `tts.js` engine.
   * Integrated guidance for the `--mute` option in the `/help` command.

4. **Developer Documentation System Restructuring (3 Categories)**
   * Organized files under `docs/` by role: System Docs (`docs/`), Developer Docs (`for_developer/`), and User Manuals (`manual/`).
   * Moved 11 existing documents (Plugin-X_Guide, FRAMEWORK_REFERENCE, audit reports, etc.) to `archive/` to minimize navigation overhead.

5. **`PLUGIN_SPEC.md` Consolidation (Single Source of Truth)**
   * Resolved over **70% redundancy** between `Plugin-X_Guide.md` and `FRAMEWORK_REFERENCE.md`, consolidating all rules/APIs/schemas into a single document (~900 lines).

6. **`QUICK_START.md` 5-Minute Guide**
   * Added an onboarding guide to complete the first plugin within 5 minutes, from using `create_plugin.py` to checking results.

7. **`create_plugin.py` Boilerplate Generator**
   * Authored a new plugin skeleton auto-generation script (~665 lines) supporting `--id`, `--name`, `--permissions`, `--csp-domains`, etc.

8. **New English Developer Documentation**
   * Authored `QUICK_START_en.md`, `PLUGIN_SPEC_en.md`, and `AI_AGENT_PROMPT_en.md` to ensure accessibility for global developers.

9. **Frontend/Backend Consistency Full Audit**
   * Conducted a full audit of frontend-backend call parameters and response schemas and corrected inconsistencies.

---

## [v2.4.5] AXC (AEGIS Extreme Cache) & 0ms Speed Boot Integration (2026-03-04)

### 🚀 Core Updates

1. **AXC (AEGIS Extreme Cache) System Introduction**
   * Utilizes browser persistent storage (**IndexedDB**) to aggressively cache all plugin sources (HTML/JS/CSS) locally.
   * Identifies all plugin data with SHA256 hashes at server start; if hashes match the client, loads instantly (**under 10ms**) without network download.

2. **Parallel Hybrid Loading (v2.4.0) Parallelization**
   * Majorly overhauled the sequential plugin loading process into a `Promise.all`-based parallel process.
   * Retained DOM creation order while processing logic hydration simultaneously, completely removing loading bottlenecks.

3. **Avatar Loading HUD (v2.3.5) Introduction**
   * Displays a dedicated "AVATAR UNIT LOADING..." scanning HUD until the heavy Live2D model is fully visible.
   * Optimized initialization timing for immediate HUD activation upon page parsing, zeroing out perceived waiting time.

4. **Precise Metrics Segregation**
   * Separated performance logs into `Network Check`, `Asset Preparation`, and `Logic Execution`.
   * Developers can now accurately track if caching is working (`AssetPrep < 20ms`) and which widget causes logic execution bottlenecks.

5. **Backend JSON Pre-serialization Optimization**
   * Performs plugin data serialization once at server start and caches it in memory.
   * Minimized server response time (TTFB).

---

## [v2.2.1] Terminal Command Routing Fix & Alias Sync (2026-03-04)

### 🚀 Core Updates

1. **Backend-Frontend Alias Sync System (Auto-Discovery)**
   * Frontend `CommandRouter` automatically scrapes and syncs `aliases` registered in the backend `register_context_provider`.
   * Eliminated the need to hardcode Korean aliases in the frontend; terminal nicknames are now added solely via backend modification.

2. **Command Routing Mismatch Full Fix (Canonical Routing)**
   * Resolved a bug where widgets would not listen after `/뉴스` was converted to `/news`, causing AI fallbacks.
   * Ensured all widgets (news, weather, stock, finance, notion, climate-control, yt-music, etc.) receive **Canonical Commands** matching their IDs.

3. **Prompt De-hardcoding**
   * Removed hardcoded personas and labels like "AEGIS" and "Response:" in `gemini_service.py` in favor of a `prompts.json` loading method.
   * Strengthened dynamic context replacement features for `{{current_time}}`, `{{modules}}`, etc.

4. **AI Response High-Pass Filtering**
   * Applied `strip_markdown_wrappers` to all AI output fields (`display`, `briefing`, `voice`) to completely remove markdown noise.
   * Internalized data anonymization and refinement processes based on `ai_filter.json` rules.

---

## [v2.2.0] Terminal Intent & HUD Alias System Establishment (2026-03-03)

### 🚀 Core Updates
1. **Introduction of Terminal Intent Parsing Architecture**
   * Implemented **Intent-based forced routing** based on terminal query prefixes.
   * `# (Search)`: 100% bypasses the system's reasoning process and forces calls to external tools like Google Search.
   * `@ (Context Specification)`: Directly injects data from desired widget plugins into the AI prompt.

2. **Multiple Aliases Support & Vector DB Roadmap Cancellation**
   * Plugins are no longer identified solely by ID, now offering fluid Korean synonym identification like `aliases=['scheduler', 'schedule']`.
   * Shifted strategy from the Vector DB-centric architecture (search_memory) to a real-time Zero-Shot Context assembly architecture.

3. **Terminal Overlay HUD (Shift + ~)**
   * The hotkey has been completely changed from `Shift + /` to `Shift + ~` (Quake-style HUD).
   * Upgraded the `/help` command to display this dynamic alias and structure.

4. **TTS Mute Option (`--m`, `--mute`) Internalization**
   * The frontend router autonomously parses queries containing `--m` or `--mute` to skip the `tts.js` call (voice output) while keeping response paths and UI logs functional.

---

## [v2.1.0] AI Response Standardization & System Stabilization (2026-03-03)

### 🚀 Core Updates

1. **AI Response Field Standardization**
   * Unified AI response specifications across the system into `display` and `briefing`.
   * `display`: For terminal and log output (can include rich text/markdown).
   * `briefing`: For voice (TTS) and speech bubble output (pure text filtering applied).
   * Fundamentally blocked TTS mis-output and parsing errors due to data inconsistency.

2. **Centralized Markdown Refinement (High-Refinement)**
   * Introduced `strip_markdown_wrappers` utility in `utils.py`.
   * Immediately refines AI responses even if wrapped in ```json ... ```, maximizing parsing success rates.
   * Implemented 2nd-stage filtering (`stripMarkdown`) in frontend `tts.js` just before voice output to ensure noise-free speech.

3. **Multi-engine Command Routing (AI Hub v2.0)**
   * Upgraded `CommandRouter` to allow external engines (Gemini, Ollama, ChatGPT) to analyze system commands.
   * Automatically injects unique command prompts for each plugin during external engine queries.

4. **Global TTS & HUD Integration Service**
   * Unified speech playback logic previously handled by individual widgets into global `window.speakTTS` and `context.speak()`.

### 🛠️ Bug Fixes

* [Fixed] Error caused by missing `text` field when receiving briefing data.
* [Fixed] Paralysis caused by 404 error in `ai_gateway.js` during terminal command entry.
* [Fixed] Noise where markdown symbols were read aloud during voice output.
* [Fixed] Circular reference and import errors when referencing `gemini_service` from specific plugin routers.

---

## [v2.0.0] Full Plugin-X Adoption & Shadow DOM Isolation (2026-03-02)

* Complete pluginization of core widgets such as Terminal and Search Window.
* Prevention of style/script conflicts via Shadow DOM.
