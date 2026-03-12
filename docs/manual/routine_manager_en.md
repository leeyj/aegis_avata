# 🕒 Routine Manager (Briefing Scheduler) Detailed Guide v1.9

The AEGIS Routine Manager is the central control center for precisely managing all automation activities and widget active hours. The `v1.9` update integrates an intuitive GUI editor and data-driven **Condition Watch** features.

---

## 🚀 1. Key Features

### 🛡️ Gatekeeper
Defines the **'Allowed Hours'** during which specific widgets or features can operate.
- **Stock**: Allow notifications only during market hours.
- **Gmail**: Check for new emails only during work hours.
- **Proactive**: Limit the avatar to initiating conversations only during active hours (excluding sleep time).
- **Edit Feature**: Modify start/end times (HHMM) and applicable days via the ✏️ button for each item.

### 📅 Automation Routines
Automatically executes specific actions at set times.
- **Scheduled Briefing**: Integrated summary reports of weather, finance, and schedules every morning at 9 AM.
- **Condition Watch (v1.8)**: Instantly execute TTS or actions when specific data values exceed thresholds (e.g., stock market plunge, high-temperature alerts).
- **Media Control**: Play or stop YouTube music at specific times.
- **Wallpaper Switching**: Automatically change wallpapers to match the mood.
- **Universal Action (v1.7.1)**: Directly call terminal commands (`terminal_command`) or backend APIs (`api_call`) to control any widget.
- **Custom TTS**: Output user-defined text using AI voice (Supports variable substitution like `{{value}}`).

---

## 🛠️ 2. Workflow

### Adding and Modifying Routines
1. Click **🕒 Routine Manager** in the sidebar.
2. Click the **+ Add** button or the **EDIT** button on an existing routine.
3. Select an **Action** from the dropdown to see a detailed description.
4. **Trigger = 'Condition Watch'**: The system automatically scans plugin `manifest.json > exports` to provide a dropdown of monitorable sensors. Users can select by sensor name without needing to know API addresses.
5. Set the time and days, then click **APPLY**.

### Gatekeeper Settings (Active Hours)
1. Click the ✏️ button on the right side of a Gatekeeper item.
2. Select a **Logic Type**:
    - **Allow**: Operation permitted only during the entered time range.
    - **Deny**: Operation blocked during the entered time range (e.g., no avatar speech at night).
3. Enter time in **HHMM** format (e.g., `0900`, `1830`).
4. Select days and click **APPLY**.

### Saving Settings
- All changes must be permanently saved to the server by clicking the **SAVE ALL CONFIGURATIONS** button at the bottom. This instantly restarts the scheduler engine with the new settings.

---

## 🛠️ 3. Technical Details (For Power Users)

### Condition Type System
The Routine Manager intelligently performs comparisons based on the data type declared by the plugin:
- **Number**: Numerical comparisons using `>=`, `<=`, `>`, `<` (e.g., temp >= 30).
- **String**: Status comparisons using `==`, `!=` (e.g., weather == "RAINY").
- **Boolean**: State checks using `true / false` (e.g., system alert active).

### TTS Template Variables
Variables inside `speak` action text are replaced with real-time data:
- `{{value}}`: Currently measured sensor value (e.g., 28.5).
- `{{threshold}}`: User-set threshold value (e.g., 25.0).

---

## 🖼️ 3. Main Interface
*(Refer to Korean documentation for interface screenshots)*

---
> [!TIP]
> Enter the **hourly** keyword in the time field to run a routine every hour on the hour. Use it for stretching reminders or hourly announcements!
