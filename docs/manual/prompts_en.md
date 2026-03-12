# 🧠 AEGIS Prompts Management Guide (Prompts Specification)

This document defines the structure and purpose of each section in `config/prompts.json`, which controls the intelligent responses of the AEGIS system. Users can customize the AI assistant's tone, analytical depth, and response format by modifying this file.

---

## 1. Prompt Hierarchy (JSON Structure)

The prompt file is divided into three core domains:

| Top-level Key | Target Service | Primary Purpose |
| :--- | :--- | :--- |
| `DASHBOARD_INTERNAL` | `gemini_service.py`, `briefing_manager.py` | Dashboard widget analysis, auto-briefing, and proactive notification generation. |
| `EXTERNAL_AI_HUB` | `ai_service.py` | Guidelines for querying external AI (Grok, Ollama, etc.) via the terminal. |
| `NLP_COMMAND_ENGINE` | `gemini_service.py` | Analyzing natural language commands and mapping them to system actions. |

---

## 2. Detailed Section Guide

### 2.1 DASHBOARD_INTERNAL (For Internal Logic)
Determines how the avatar actively reports based on system data.

- **`briefing`**: Main prompt for integrated analysis of all system data (Weather, Finance, Schedule, etc.).
- **`proactive`**: Defines how to address the user when specific triggers occur (e.g., sharp index fluctuations).
- **`widget_briefing`**: Instructions used focusing on summarizing data for an individual widget.

### 2.2 EXTERNAL_AI_HUB (For External AI Integration)
Provides optimized instructions for each AI engine selected in the terminal. The system prioritizes the prompt matching the selected `source_key`, falling back to `default` if none is found.

| Sub-key | Application | Characteristics |
| :--- | :--- | :--- |
| `default` | Common | Basic guide including [DISPLAY] and [VOICE] separation rules. |
| `ollama` | Ollama (Local) | Clear and concise response instructions considering local resource efficiency. |
| `grok` | Grok (xAI) | Tactical and refined tone instructions using the latest data. |
| `gemini` | Gemini (Google) | Instructions focused on rich intelligence and logical analysis. |
| `chatgpt` | ChatGPT (OpenAI) | General, creative, and detailed response instructions. |

> [!IMPORTANT]
> **Dual-Response Standard ([DISPLAY] / [VOICE])**
> All external AI hub prompts must be designed to separate screen-based and voice-based responses using these tags.

### 2.3 NLP_COMMAND_ENGINE (For Natural Language Control)
Logic for parsing voice or text commands into system control JSON.

- **`command_parsing`**: Rules to convert commands like "Turn on weather widget" into `action` and `target` pairs.

---

## 3. Customization Tips
1. **Changing Tone**: Add a persona like "Always answer in a military tone" at the end of each section's instructions to instantly change the avatar's personality.
2. **Adjusting Summary Length**: Modify character limits or sentence count instructions in the `[VOICE]` area to control the length of the avatar's speech.
3. **Mandatory Tags**: Ensure `[DISPLAY]` and `[VOICE]` tags are included as they are used for parsing in the server code.

---
*Last Updated: 2026-03-02 (v1.9)*
