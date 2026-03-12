# AEGIS Plugin-X: Home Assist Development Case Study (v4.0.0)

This document records in detail the core design philosophies and technical implementation cases discussed while migrating the **TinyTuya-based air conditioner control system** to AEGIS's next-generation architecture, **Plugin-X (v4.0.0)**. v4.0.0 aims for physical isolation based on Iframe and ultra-fast runtime via AXC (AEGIS Extreme Cache).

---

## 🎨 0. System Configuration Diagram (Visual Concept)

> [!NOTE]
> **[Figure 1: AEGIS v4.0.0 Plugin-X Integrated Architecture Diagram]**
> - **Left (Isolator)**: Independent Plugin folder and Iframe Sandbox (Manifest, Assets, Router)
> - **Center (Infrastructure)**: AEGIS Core (Modular Loader, AXC Engine, Capability Proxy, Security Service)
> - **Right (Cognitive Layers)**: Service Layer (Routine Manager, AI Schema, Intelligence Hub, TTS)
> - **Bottom (Hardware)**: IoT Hardware (TinyTuya Hub, AC)

From v4.0.0, all widgets are physically separated from the main system through **Iframe Isolation** and are hydrated instantly within 10ms without network latency via **AXC** technology.

---

## 🏗️ 1. Development Evolution (AS-IS vs TO-BE)

### 1-0. Original Script (AS-IS: Single Procedural Structure)
Before integration, it operated based on loops, monopolizing system resources and causing blocking, as shown below.

```python
import tinytuya
import time
import json

# --- Device Settings (Obfuscated for privacy) ---
HUB_ID = 'YOUR_HUB_ID'
HUB_KEY = 'YOUR_HUB_KEY'
HUB_IP = '192.168.0.XXX'
AC_ID = 'YOUR_AC_ID'

hub = tinytuya.Device(HUB_ID, HUB_IP, HUB_KEY)
hub.set_version(3.3)

def set_ac_all_in_one(power=True, temp=24, mode=1, wind=1):
    command_list = [
        {"code": "PowerOn" if power else "PowerOff", "value": "PowerOn" if power else "PowerOff"},
        {"code": "T", "value": int(temp)},
        {"code": "M", "value": int(mode)},
        {"code": "F", "value": int(wind)}
    ]
    dps_data = {'201': json.dumps(command_list)}
    payload = {'protocol': 5, 't': int(time.time()), 'data': dps_data, 'devId': HUB_ID, 'cid': AC_ID}
    return hub.send(payload)

def run_aegis_final():
    while True:
        try:
            status = hub.status()
            if 'dps' in status:
                temp = status['dps']['101'] / 10.0
                print(f"[*] Current Temp: {temp}°C")
                # ... Auto control logic ...
            time.sleep(10) # 10s Wait (Blocking)
        except Exception as e: break
```

### 1-1. AEGIS Integrated Structure (TO-BE: Plugin-X v4.0.0)
The procedural code above was distributed by role and perfectly isolated from the core system to ensure safety.

- **Backend (`climate_service.py`)**: Business logic (TinyTuya communication) class-based and uses **standard utilities** considering OS compatibility.
- **Router (`router.py`)**: Registration of **Deterministic Actions** and briefing engine via the v4.0.0 `initialize_plugin` pattern.
- **Frontend (`widget.js`)**: **Event Delegation** and ES module loading in an isolated runtime based on **Iframe Isolation**.
- **Automation (`manifest.json`)**: Delegation of sensor data sovereignty and execution permissions (Exports) to the Routine Manager.

---

## 🛠️ 2. Core API and Domain Knowledge Guide (Exhaustive Technical Details)

All specifications of v4.0.0 are described to prevent errors due to 'guesses' that may occur when other developers or AI take over the work.

### 2-1. System Standard Utilities (`utils.py`)
All plugins must use system standard utilities instead of direct `json.load` to perform file locking and encoding exception handling.

| Function | Parameters | Return Value | Characteristics |
|---|---|---|---|
| `load_json_config(path)` | `path`: Absolute file path | `dict` | Returns `{}` if file is absent, auto-handles `utf-8-sig`. |
| `save_json_config(path, data)` | `path`: Path, `data`: Object to save | `bool` | Prevents data damage via Atomic Write. |

### 2-2. Briefing Engine and Action Integration (`services.plugin_registry`)
Essential patterns for letting a plugin participate when a user says "Give me a news briefing" or types a terminal command.

- **Registry API**: 
  - `register_context_provider(plugin_id, provider_func, aliases=None)`: Dynamically injects plugin data during AI briefing.
  - `register_plugin_action(plugin_id, action_id, handler_func)`: **[v4.0]** Maps deterministic actions defined in `manifest.json` to handlers. (Key to defending against AI hallucinations)
- **Example (router.py)**:
  ```python
  def initialize_plugin():
      # When '/ac' or 'temp' is typed in the terminal, this plugin's data is provided to AI
      register_context_provider("climate-control", get_climate, aliases=["ac", "indoor_temp"])
      # Calls handle_set_temp when the 'set_temp' action from manifest.json occurs
      register_plugin_action("climate-control", "set_temp", handle_set_temp)
  ```

### 2-3. TinyTuya Domain Special Knowledge (DPS Protocol)
This part is the hardware manufacturer's specification and is the **Ground Truth** that AI must not 'optimize' or modify arbitrarily.

- **DPS ID `201`**: Air conditioner integrated control channel (Controls Power, Temp, Mode, Fan all at once).
- **Command Object Structure**: Must be a **list object** in the form of `[{"code": "PowerOn", "value": "PowerOn"}, ...]`.
- **JSON Serialization Mandatory**: This list must be converted to a string via `json.dumps()` and assigned to `dps_data['201']` for the TinyTuya hub to recognize it correctly.

---

## 🏗️ 3. Reasons for pivoting to v4.0 architecture (Philosophical Background)

### 3-1. Iframe Isolation vs Legacy Shadow DOM
- **Past (Shadow DOM)**: It was isolated, but occasional style breakages or global variable pollution occurred due to shared CSS variables or JS runtime of the main page.
- **Present (Iframe)**: Executes in a physically different Window context. Communicates with the system only through the reserved `context` object (Capability Proxy), fundamentally blocking a plugin from bringing down the main system.

### 3-2. Performance Innovation via AXC (AEGIS Extreme Cache)
- To resolve the 'initial loading delay', which is a disadvantage of the Iframe method, all assets are cached in IndexedDB. Since it is version-managed through SHA256 hashes, the system immediately hydrates the UI from internal storage without network requests.

---

## 🧩 4. Actual Implementation: Guide based on Exhaustive Audit

### 4-1. Data Exposure (manifest.json)
The specification that allows the Routine Manager to "discover" this plugin.

```json
{
    "id": "climate-control",
    "name": "AC Integrated Control",
    "version": "4.0.0",
    "hybrid_level": 2,
    "entry": {
        "html": "assets/widget.html",
        "js": "assets/widget.js",
        "backend": "router.py"
    },
    "exports": {
        "sensors": [
            {
                "id": "indoor_temp",
                "name": "Indoor Temperature",
                "unit": "°C",
                "type": "number",
                "endpoint": "/api/plugins/climate-control/status",
                "field": "temp"
            }
        ],
        "actions": [
            {
                "id": "ac_off",
                "name": "Turn off AC",
                "type": "terminal_command",
                "payload": { "command": "/ac off" }
            }
        ]
    }
}
```

### 4-2. Frontend: Event Delegation Pattern (widget.js)
In v4.0.0, listeners are not attached directly to individual elements; instead, they are handled by delegation from the `root`.

> [!TIP]
> **[v4.0.0 Security Tip]**: Since the Iframe sandbox runs with `origin: null`, relative absolute paths like `/api/...` are not resolved when importing external JS files. You must use `context.resolve('assets/my_module.js')` to convert it to a **Full URL (Absolute URL)** before calling `await import()`.

```javascript
export default {
    init: async function (root, context) {
        // ⛔ stopPropagation call mandatory: block interference with widget drag (Move) event
        root.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            e.stopPropagation();

            const action = btn.getAttribute('data-action');
            if (action === 'power-toggle') this.togglePower();
        });
        
        // Register terminal alias (/ac) handler
        context.registerCommand('/ac', (cmd) => this.handleCommand(cmd));
        
        await this.refresh();
    },
    // ... rest of implementation
};
```

### 4-3. Routine Engine's Condition Monitoring Logic
When a user sets "If the temperature is 28 degrees or higher, turn on the air conditioner" in the Routine Manager:
1.  **Poll**: The Routine Engine calls the `endpoint` to collect summary context.
2.  **Evaluate**: Compares `value` based on `field` and `type`.
3.  **Execute**: When conditions are met, sends the command defined in `exports.actions` to the terminal or performs `api_call`.

---

## 💅 5. Premium Design and UX
- **Glassmorphism**: UI utilizing `backdrop-filter: blur(12px)` and system neon colors.
- **Micro-animations**: Rotation animation applied to the wind direction icon when the air conditioner is running.
- **UX**: Assigns the `.no-drag` class to all interactive elements to prevent the widget from moving unexpectedly during control.

---

## 💡 Comprehensive Evaluation: Difference in Outcome when Handing Over to AI
Regarding the question, "Is migration to the v4.0.0 standard possible while maintaining all existing details?", this case presents a perfect affirmation. As long as standardized `manifest.json` and `Plugin-X_Guide.md` exist, any intelligent agent can produce a plugin of the same quality **without touching the system core**. This is the reality of the **secure collaboration framework** that AEGIS aims for.

---
**AEGIS Ecosystem Development Reference v4.0.0**
**Case Study: TinyTuya Climate Control Integration & V4 Migration**
**Document Maintenance: AEGIS Core Team (No Summarization Policy Applied)**
