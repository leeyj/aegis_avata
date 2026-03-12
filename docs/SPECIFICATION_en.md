# AEGIS Intelligence - Integrated System Specification (SPECIFICATION)

**Last Updated: 2026-03-11 (v4.0.0 Hybrid/Iframe Standard)**
This document defines the backend/frontend core design principles and system specifications for AEGIS v4.0.

---

## 🏗️ 1. Core Architecture Design Principles

### 1.1 Pure Iframe Isolation (v4.0 Core)
- Every widget runs within an independent **Iframe**.
- Physical isolation from the parent page (Main UI) prevents global variable pollution and CSS interference at the source.
- Communication with the main system is securely achieved only through the **PluginContext** based on `postMessage`.

### 1.2 Resource Proxy & Capability Bridge
- Plugins do not directly access browser APIs or the file system; instead, they use the `context` bridge provided by the system.
- Permissioned tasks (TTS, AI requests, changing system settings, etc.) are centrally controlled according to the permissions defined in `manifest.json`.

### 1.3 ES Module & Async Loading
- Widget logic follows the ES module standard (`${id}/assets/widget.js`), and large-scale modules can be dynamically imported (`import()`) if necessary.
- Asset locations are dynamically determined via `context.resolve()`, so there is no need to worry about path differences between development and production environments.

### 1.4 Event Delegation & Non-Blocking Interaction
- **data-action**: It is recommended to assign behavior-oriented attributes to HTML elements and manage events collectively at the root by capturing them.
- **Propagation Control**: Strict event bubbling blocking policies are applied to ensure that clicks within the widget do not interfere with avatar dragging or system events.

---

## 🧩 2. System Interface (API Specs)

### 2.1 PluginContext API (Frontend)
| Function | Description |
|---|---|
| `resolve(path)` | Converts a relative path into a runtime absolute URL. |
| `requestCore(cmd, args)` | Calls system core events (RELOAD_CONFIG, SHOW_MODAL, etc.). |
| `onSystemEvent(evt, callback)` | Receives global synchronization signals (SYNC, REFRESH). |
| `speak(display, briefing)` | Executes integrated voice and visual briefing. |

### 3.2. Exports (Inter-plugin Connectivity)
Each plugin can expose its state and capabilities for the Routine Manager:
- `sensors`: Real-time data points (e.g., Temperature, Stock Price).
- `commands`: Terminal command guides and prefixes.
- `actions`: Deterministic actions that can be triggered by routines (e.g., Briefing, Playback).

#### manifest.json - exports format:
```json
"exports": {
  "sensors": [
    { "id": "tid", "name": "Name", "unit": "Unit", "type": "number", "endpoint": "/api/...", "field": "key" }
  ],
  "commands": [
    { "prefix": "/pfx", "name": "Name", "examples": ["/pfx arg"] }
  ],
  "actions": [
    { "id": "aid", "name": "Name", "description": "Desc", "type": "terminal_command", "payload": { "command": "/cmd" } }
  ]
}
```

### 2.2 Backend Router Pattern
- Uses fixed API paths in the format `/api/plugins/{id}/...`.
- Mandates the registration of deterministic actions and briefing data context providers via `initialize_plugin()`.

---
**AEGIS v4.0 Architectural Standard**
