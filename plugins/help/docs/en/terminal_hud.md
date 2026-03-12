# ⚡ Terminal Overlay HUD (Command Center)

The terminal HUD introduced in AEGIS v2.0 allows you to issue commands intuitively.

## ⌨️ How to Use
- **Shortcut**: Press **`Shift + ~`** (Quake style) anywhere to toggle the HUD.
- **Help**: Type `/help` to see widget information.

![Terminal HUD](/static/img/user_guide_terminal1.png)

## 🖥️ Unified Command Routing (v3.4)
The prefix determines the AI's operation mode.

1.  **🧠 Hybrid Reasoning ( `/@` )**
    - Combines local context with real-time web search.
    - e.g., `/@ Recommend lunch menu based on my calendar today`
2.  **🏠 Local-Only Summary ( `/` )**
    - Uses only system data. Best for private reports.
    - e.g., `/news`, `/briefing on stocks`
3.  **🌐 Deterministic Web Search ( `/#` )**
    - Bypasses local context for 100% web search.
    - e.g., `/# Tell me NVIDIA's current stock price`
4.  **🤖 Autonomous Conversation (No prefix)**
    - AI decides context usage autonomously.

## 💡 Options
- **Silent Mode (`--m` / `--mute`)**: Append to a command for text-only response without TTS.
