# AEGIS Dashboard User Guide v2.2

Welcome to the AEGIS Dashboard! This guide helps even non-technical users perfectly set up and utilize the system. It covers the system updates up to **v2.2**, including Plugin Sandboxing and enhanced Terminal Intent parsing.

---

## 1. Initial Login & Account Setup

AEGIS account authentication is managed in the `config/secrets.json` file for security.

1. Open `config/secrets.json` in a text editor. (If it doesn't exist, copy `secrets.example.json` and rename it.)
2. Find the `"USER_CREDENTIALS"` section and set your username and password:
   ```json
   "USER_CREDENTIALS": {
       "admin": "admin123",
       "my_id": "my_password"
   }
   ```
3. Refresh the dashboard and log in with the updated credentials.

---

## 2. UI Controls

### 🔓 Widget Lock & Unlock (Drag & Resize)
Click the **padlock icon** at the top of the dashboard to fix or freely arrange widgets.
- **🔓 Unlock**: Drag empty areas of widgets to move them, or resize via the handle at the bottom right.
- **🔒 Lock**: All widgets are fixed. Useful for preventing accidental clicks and focusing on interaction with the avatar.
- **Tip**: Buttons and inputs function normally even when unlocked (though some areas might have limited interaction to allow dragging).

### ⛈️ Real-time Environment Effects (Weather Dynamics)
When the weather plugin detects **RAINY, SNOWY, or STORM** conditions, visual effects automatically appear across the screen.
- This feature is synchronized with the avatar's reactions, changing the dashboard's atmosphere in real-time.

### ⚡ Terminal Commands & Overlay HUD (v2.2 New)
Press the shortcut **`Shift + ~`** anywhere on the dashboard to bring up a Quake-style terminal overlay HUD for intuitive commands.
- **Intent-based Forced Routing**: Define the intent of the command with the first character.
  - `# (Search)`: Bypasses system reasoning and forces external AI or web search calls. (e.g., `# How is the weather in Seoul today?`)
  - `@ (Context Target)`: Directly injects specific widget data matching the registered alias. (e.g., `@calendar Do I have any meetings tomorrow?`)
- **Temporary Mute Option**: Append `--m` or `--mute` to the end of your command, and the avatar will provide a text-only briefing without TTS voice output for that specific response.

---

## 3. Core Widgets & Configuration

AEGIS runs on the modular "Plugin-X" architecture, where each widget has its own configuration file.

### 3.1 Step-by-Step Widget Setup
Widget settings can be changed in each plugin folder (e.g., `plugins/[widget-name]/config.json`). Follow this tutorial sequence:

#### 📧 1) Gmail
Requires a `credentials.json` file from Google Cloud.
1. Visit [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Search and **Enable** the **Gmail API**.
3. Go to "Credentials" -> **[+ Create Credentials]** -> **OAuth client ID** (Desktop app).
4. Download the JSON file and rename it to `credentials.json`.
5. Move it to the `config/` folder in AEGIS (`config/credentials.json`).

#### ✅ 2) Todo & 📅 Calendar
Uses the same `credentials.json`.
1. **Enable** the **Google Calendar API** and **Google Tasks API** in the Cloud Console.
2. Upon first run, AEGIS will display an authentication link in the terminal or a popup.
3. Open the link, log into your Google account, and click "Allow."
4. A `token_personal.json` will be generated, automating future data retrieval.
5. Adjust `max_tasks` or `max_events` in `plugins/todo/config.json` or `plugins/calendar/config.json`.

#### 🌤️ 3) Weather
Requires an OpenWeatherMap API key.
1. Register at [OpenWeatherMap](https://openweathermap.org/).
2. Copy your key from the **"My API keys"** tab.
3. Paste it into `"OPENWEATHER_API_KEY"` under `"EXTERNAL_API_KEYS"` in `config/secrets.json`.
4. Set your `"city"` (e.g., `"Seoul"`) in `plugins/weather/config.json`.

#### 📈 4) Stock
Uses Yahoo Finance directly (no API key needed).
1. Open `plugins/stock/config.json`.
2. Add tickers to the `"tickers"` list.
   * **US Stocks**: Ticker name (e.g., `"APPLE": "AAPL"`).
   * **Korean Stocks**: Add **.KS** (KOSPI) or **.KQ** (KOSDAQ) to the 6-digit code (e.g., `"SAMSUNG": "005930.KS"`).
   * **Indices**: Use `"KOSPI": "^KS11"`.

#### 💻 5) System-Stats
Monitors local computer resources.
1. Open `plugins/system-stats/config.json`.
2. Specify hard drives to monitor in the `"disks"` section (e.g., `"C:\\"` for Windows, `"/"` for Mac/Linux).

#### 📝 6) Notion
Requires an integration token and database ID.
1. Create a **New Integration** at [Notion Developers](https://www.notion.so/my-integrations).
2. Copy the **"Internal Integration Secret."**
3. Register it as `NOTION_TOKEN` in settings or `config/secrets.json`.
4. Connect the integration to your target Notion page via the `...` menu in Notion.
5. Copy the Database ID from the page URL and paste it into the `"workspaces"` section of `plugins/notion/config.json`.

#### 🎧 7) YouTube Music
Uses browser cookie headers for session data.
1. Log in to [YouTube Music](https://music.youtube.com).
2. Open Developer Tools (`F12`) -> **Network** tab.
3. Refresh the page, click a request (e.g., `browse`), and copy the entire **"Request Headers"** (including cookies).
4. Paste it into `headers_auth.txt` in the root AEGIS folder.

---

## 4. Routine Manager Guide

The central control center for automation and widget scheduling.

### 4.1 Basic Concepts
*   **Routine**: Rules that perform actions (speech, alarms, etc.) based on time or data conditions (thresholds).
*   **Gatekeeper**: Global rules that allow or deny notifications based on day and time (e.g., silence the avatar late at night).

### 4.2 Examples
- **Email Alert**: Trigger `hourly` to call `/api/plugins/gmail/brief` for a summary.
- **Condition Watch**: If KOSPI drops by more than 2% (`<= -2.0`), announce: `KOSPI has dropped {{value}}%. Threshold {{threshold}}% breached!`
- **Morning Briefing**: Trigger at `08:00` (Mon-Fri) for a `tactical_briefing` covering weather, schedule, and news.

---

## 5. Sponsor-Only Features & Studio

Advanced visual experience settings for sponsors.

### 5.1 Wallpaper Settings
Choose modes in the wallpaper widget or `plugins/wallpaper/config.json`:
1. **Solid**: Single color.
2. **Image**: Fixed high-res image.
3. **Slideshow**: Sequential image rotation.
4. **Video**: Moving MP4 background (resource intensive).

### 5.2 Live2D Studio Guide
Manage and test Live2D animation models.
- **Add Models**: Place model folders under `test_models/` (e.g., `test_models/ANIYA/`).
- **Alias Manager**: Map avatar motions to AEGIS system events (`sad`, `joy`, `shock`, `briefing`, `idle`).
- **💡 Custom Aliases**: AEGIS supports unlimited custom aliases. Add names like `superhappy` or `wink` to call them in reactions.
- **Simulation**: Test reactions immediately using the simulator panel.
- **Production Deployment**: One-click copy of tested models to the live `models/` folder.

---
Build your perfect AEGIS dashboard by adding various widgets and your favorite avatars!
*Last Updated: 2026-03-04 (v2.2.0)*
