# AEGIS Intelligence - Handover Session (v3.4.0)

**Last Updated:** 2026-03-07  
**Main Keyword:** **"Escape from Bug-Prone State" (버그쟁이 탈출)** 🚀

This document is a handover guide for the next AI instance (or developer) to take over the v3.4.0 Global I18n and Unified Command system stabilization.

---

## 🛰️ 1. Current Progress

- **Deployment Stage**: v3.4.0 core and documentation updates completed. Deployed to the home server (`192.168.0.20`) for real-world testing.
- **Key Changes**:
  - Established a unified command routing system (`/@`, `/`, `/#`) centered on `BotManager`.
  - Global Internationalization (I18n) support (`config/i18n/` and `utils.get_i18n`).
  - Physical separation of the Discord Adapter (`DiscordAdapter`) with a loose coupling architecture.

---

## 🧪 2. Critical Testing and Verification (Testing Agenda)

1.  **Unified Command Routing Verification**:
    - Confirm that `/@` (Hybrid), `/` (Local/Summary), and `/#` (Pure Search) work as intended in both the Web Terminal and Discord.
    - Specifically, ensure that the `/` command blocks external search tools (`google_search`) and only uses local widget context.
2.  **Alarm Function Synchronization**:
    - Verify that when the AI generates an response with an `[ACTION] SET_ALARM` tag, the `BotManager` correctly interprets it and registers the alarm via `alarm_service.py`.
    - Check the dashboard alarm list (API format consistency) on the home server.
3.  **Global Persona Application**:
    - Ensure that when the user's `lang` is set to `en`, the AI loads the English persona instructions (`config/i18n/en.json`) and responds in English.

---

## 🛠️ 3. Bug Fix Scope (Fix Priorities)

If issues arise, please inspect the following layers first:

- **`services/bot_gateway.py` (BotManager)**: 
  - The brain for intent interpretation, platform-specific message conversion, and hybrid reasoning. Most routing bugs occur here.
- **`utils.py` > `clean_ai_text()`**: 
  - A utility to strip markdown wrappers and labels from AI responses. If parsing errors (e.g., JSON errors) occur, strengthen the regex/cleaning logic here.
- **`plugins/alarm/router.py`**:
  - Inconsistencies between the alarm data API and the dashboard widget cause rendering failures.
- **`config/i18n/*.json`**:
  - If the AI's response is awkward or ignores instructions in a specific language, check for missing or incorrect prompt entries.

---

## 💡 4. Guidance for the Next Instance (Notes)

- **Documentation Sync**: Main guides (`Plugin-X_Guide`, `FRAMEWORK_REFERENCE`) in both Korean and English have been synced to ~780 lines. Maintain both versions simultaneously when making changes.
- **Home Server Deployment**: After any code changes, MUST run `tools/deploy.py` to build the Linux binary and restart services on the remote server.
- **Security**: The `core_security.py` is binary-hardened. Understand the compilation process via `setup_security.py` before modifying security logic.

---
**AEGIS Intelligence v3.4.0**  
*Continue the journey to transform AEGIS into the perfect command and control platform, free from technical debt.*
