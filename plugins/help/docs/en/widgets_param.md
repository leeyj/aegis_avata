# AEGIS Widgets Unified Commands & Parameters Specification (Widgets Action Reference)

This document is a reference summarizing the deterministic commands (/) and AI-compatible parameter specifications for all built-in widgets (plugins) in the AEGIS system. All plugins support **Systematic (⚡)** mode by default, and those with a tactical prompt (`ai_prompt.md`) additionally support **Hybrid (🧠)** mode.

---

## 🛰️ Action Table & Parameters by Widget (Tactical Reference)

| Widget (ID/Alias) | Support | Action | Command Aliases (Systematic Commands) | Parameters (Params) | Function Description |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **alarm** (alram) | ⚡ | `set` | `/alarm set`, `add`, `set`, `s`, `reserve` | `time`, `title` | Schedule an alarm with time and title |
| | | `del` | `/alarm delete`, `del`, `rm` | `id` | Delete an alarm based on scheduled ID |
| | | `list` | `/alarm list`, `list`, `ls`, `l` | - | Display all currently active alarms |
| **calendar** | ⚡🧠 | `add` | `/schedule add`, `register`, `add`, `a` | `time`, `title` | Record a new event to Google Calendar |
| | | `list` | `/schedule list`, `list`, `ls`, `l`, `summary`, `briefing`, `b` | - | Check upcoming events and summaries |
| **todo** (Task) | ⚡🧠 | `add` | `/todo add`, `register`, `add`, `a` | `text` | Add a new task to Google Tasks |
| | | `done` | `/todo complete`, `end`, `done`, `complete`, `c`, `d` | `title` | Change task status to completed |
| | | `list` | `/todo list`, `list`, `ls`, `l`, `summary`, `briefing`, `b` | - | Check all tasks and completion status |
| **youtube-music** | ⚡ | `play` | `/play`, `play`, `p` | `target` | Search and play music or playlist |
| | | `pause` | `/stop`, `pause`, `stop`, `s` | - | Pause current media playback |
| | | `next` | `/next`, `next`, `n`, `skip` | - | Skip to the next track in the player |
| | | `list` | `/music list`, `list`, `l` | - | Report your YouTube music playlists |
| **weather** | ⚡ | `get` | `/weather`, `weather`, `now`, `w` | `city` | Check current weather data for a city |
| | | `brief` | `/w brief` | - | AI-based tactical weather briefing |
| **stock** | ⚡ | `price` | `/stock price`, `check`, `price`, `check`, `st` | `code` | Check real-time stock prices and market data |
| **notion** (Notion Hub) | ⚡ | `add` | `/record add`, `record`, `add`, `w` | `text` | Quick memo entry to Notion database |
| | | `clean` | `/ns clean` | - | Auto-classify and organize Notion knowledge base |
| | | `search` | `/ns search` | `keyword` | Search unified information within Notion |
| | | `memo` | `/memo` | `text` | Record quick text-based memo to Notion |
| **news** | ⚡🧠 | `brief` | `/news summary`, `news`, `briefing`, `briefing`, `news`, `b` | - | Report summarized results of latest news pack |
| **system-stats** | ⚡ | `report` | `/system status`, `report`, `report`, `status`, `st` | - | Report local resource availability (CPU, RAM) |
| **terminal** | ⚡ | `run` | `/exec`, `command`, `run`, `ex`, `c` | `command` | Execute system terminal commands directly |
| **climate-control** | ⚡ | `ac` | `/ac on`, `off`, `set` | `temp` (number) | Control smart AC power and target temperature |
| **help** (Help Center) | ⚡🧠 | `summary` | `/help`, `help`, `h`, `?` | - | Activate Markdown-based integrated help center |
| **finance** | ⚡ | - | - | - | Global financial market index monitoring |
| **gmail** (Email) | ⚡ | - | - | - | Support for Google email reception and summary |

---

## 💡 Command System Guide (Systematic & Hybrid)

### 1. Systematic Mode (⚡)
Executes commands directly by interpreting them without AI intervention.
- **Format**: `/[Plugin ID] [Action] [Parameters]`
- **Parameter Separation**: Use the **pipe (`|`)** symbol for multiple arguments.
  - Example: `/alarm add 08:00 | Refreshing morning wake-up`
- **Short-cut Execution**: If focused on a plugin (e.g., via sidebar), you can omit the plugin name and execute by typing only the action.

### 2. Hybrid Mode (🧠)
A conversational execution mode combining real-time data and AI reasoning.
- **Format**: `/@ [Plugin ID] [Natural Language Query]`
- **Features**: AI understands the context even without exact parameter formats.
  - Example: `/@todo Organize tasks to be completed by this weekend` -> Executes `list` action with analysis.
  - Example: `/@alarm Schedule exercise for 8 AM tomorrow` -> Automatically normalized to `set` action.

---
*This document was written based on the current `manifest.json` and `ai_prompt.md` data in `plugins/`.*
