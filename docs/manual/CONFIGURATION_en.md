# ⚙️ AEGIS Complete Configuration Guide

This document is an integrated guide for all configuration files within the `config/` directory that control the entire operation of the AEGIS system. Users can refer to this document to perfectly customize the appearance, intelligence, and security of the system.

---

## 1. Core System Settings

### 1.1 `api.json` (AI Integration & Model Settings)
Manages connection information for external AI engines (Grok, Ollama, etc.) selectable from the terminal.
- `default_source`: The default AI key selected when the dashboard starts.
- `sources.{key}.model`: Name of the AI model to call (e.g., `grok-4-1-fast-reasoning`).
- `sources.{key}.api_type`: `ollama` (local) or `openai` (compatible with external services).
- `sources.{key}.active`: Whether the system is enabled.
- `sources.{key}.mock`: If set to `true`, response simulation is possible without actual API costs.

### 1.2 `secrets.json` (Security & API Keys)
⚠️ **The most critical file**—never share it with others.
- `GEMINI_API_KEY`: Google Gemini key for core analysis and automatic briefings.
- `AI_PROVIDER_KEYS`: Actual service keys for each engine like xAI (Grok), OpenAI, etc.
- `EXTERNAL_API_KEYS`: Interface keys for securing communication between terminal widgets and the server.
- `USER_CREDENTIALS`: User ID/PW for dashboard login.

### 1.3 `system.json` (Server Monitoring)
- `disks`: Paths of storage devices to monitor (e.g., `Nas`, `Root`, etc.).
- `show_cpu / show_memory`: Whether to display resource bar graphs.

### 1.4 `settings.json` (User Environment Settings)
Manages personalized user settings such as dashboard layout, language, and timezone. (Located in the root directory)
- `lang`: System display language (`ko` or `en`).
- `timezone`: User local timezone (e.g., `Asia/Seoul`, `America/New_York`). Used as the reference time for AI briefings and alarms.
- `ui_positions`: Screen position data for each widget panel.
- `panel_visibility`: Activation/deactivation status of each panel.
- `user_zoom / offset_x / offset_y`: Overall screen zoom and center position adjustment values. These values are saved automatically and do not need to be manually modified by the user.

---

## 2. Intelligent Assistant Settings

### 2.1 `prompts.json` (Persona & Instruction)
Determines the assistant's tone and response strategy. (Refer to the [Prompt Guide](./prompts_en.md) for details)
- `DASHBOARD_INTERNAL`: Tone for briefings and proactive notifications.
- `EXTERNAL_AI_HUB`: Tailored instructions for each AI engine (Grok, Ollama, etc.) when queried via terminal.
- `NLP_COMMAND_ENGINE`: Natural language command analysis rules.

### 2.2 `proactive.json` (Proactive Notification Criteria)
Sets thresholds for when the assistant initiates conversation in specific situations.
- `thresholds.finance_change_abs`: Notify when stock indices change by more than a certain %.
- `thresholds.calendar_lead_time_min`: Notification lead time (minutes) before an event starts.
- `thresholds.system_cpu_percent`: Criterion for notification when CPU load is high.

### 2.3 `tts.json` (Voice Settings)
- `lang`: Voice language (default `ko-KR`).
- `rate / pitch`: Adjustment of voice speed and tone pitch.

---

## 3. Widgets & Reactions

### 3.1 Real-time Data Widgets
- **`plugins/weather/config.json`**: Settings for city (`city`) and update interval (`update_interval_min`). Rain/snow effects are automatically triggered by the interaction between this data and `reactions.json`.
- **`plugins/stock/config.json`**: Market indices (`tickers`) to display at the top of the dashboard and font size.
- **`plugins/news/config.json`**: RSS feed URLs (`rss_urls`) and number of articles to display (`max_items`).
- **`plugins/clock/config.json`**: Clock display format (`format`) and text color (`color`).
- **`plugins/notion/config.json`**: Detailed settings for Notion workspaces and connected DB ID management.

### 3.2 `reactions.json` (Avatar Auto-Reactions)
Rules for motions and lines performed by the avatar based on data changes. (Refer to the [Reaction Guide](./reactions_guide_en.md) for details)
- `condition`: Conditions under which a reaction is triggered (e.g., `change_pct >= 3`).
- `actions`: A set of motions (`MOTION`), expressions (`EMOTION`), speech (`TTS`), and environment effects (`WEATHER_EFFECT`).

### 3.4 `Live2D Studio` (Avatar Development Environment)
- A dedicated tool for testing new models and optimizing `alias.json`. (Refer to the [Studio Guide](./live2d_studio_en.md) for details)
- Supports asset management under `test_models/` and production deployment features.

---

## 4. Notion Integration Management

### 4.1 Integration Preparation (`secrets.json`)
Two items are essential for using the Notion API:
- `NOTION_API_KEY`: Internal integration token generated at [Notion Developers](https://www.notion.so/my-integrations).
- `NOTION_DATABASE_ID`: The last 32-character UUID of the linked database page URL.

### 4.2 Multi-Workspace Settings (`notion.json`)
Allows for separate management of memos and tasks by destination.
- `workspaces`: List of databases to be used.
    - `name`: Human-readable name (e.g., "Work").
    - `alias`: Terminal prefix (e.g., "@Work").
    - `id`: UUID of the database.
    - `is_default`: Whether this is the default save location when no alias is entered (`true`/`false`).

### 4.3 Auto-Cleanup Rules (`notion_rules.json`)
Defines automation rules to keep the database clean.
- `active`: Whether the rules engine is enabled.
- `rules`: List of individual rules.
    - `name`: Rule name (e.g., "Discard completed items").
    - `conditions`: Trigger conditions (title keywords, regex, empty properties, etc.).
    - `action`: Action to perform (change specific property to a designated value).

---

## 5. Customization Tips
1. **Server Restart**: Most JSON configuration changes require a server restart or page refresh to take effect.
2. **Backup Recommended**: Back up the `config/` directory before making changes for easy recovery.
3. **Troubleshooting**: Incorrect JSON syntax (missing commas, braces, etc.) can cause server startup failure.

---
*Last Updated: 2026-03-04 (v2.2.0)*
