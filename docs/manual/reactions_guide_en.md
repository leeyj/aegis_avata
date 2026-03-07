# 🎭 Reaction Engine (Avatar Auto-Reaction) Guide v1.9

The AEGIS avatar automatically reacts when specific conditions are met by analyzing real-time data. This logic is controlled in `config/reactions.json`.

---

## 1. Operating Principle
1. The system scans weather and financial data at regular intervals.
2. It compares the values (status) of each data point with the `condition` defined in `reactions.json`.
3. If conditions are met, the defined set of `actions` is inserted into the execution queue.

---

## 2. Data Domains & Conditions

### 2.1 Stock / Finance (`stock`)
- **Collected Data**: `change_pct` (Change rate), `name` (Ticker name), `price` (Current price).
- **Example Conditions**: 
  - `change_pct >= 3`: Triggered on price surge.
  - `change_pct <= -3`: Triggered on price plunge.

### 2.2 Weather (`weather`)
- **Collected Data**: `status` (Weather status - RAINY, SNOWY, SUNNY, etc.).
- **Example Conditions**:
  - `['RAINY', 'STORM'].includes(status)`: Triggered when it rains.

---

## 3. Execution Actions (Actions)

Defines a list of actions the avatar performs upon reaction.

- **MOTION**: Play a specific animation file (.motion3.json) or Alias.
- **EMOTION**: Apply a specific expression file (.exp3.json) or Alias.
- **WEATHER_EFFECT**: Trigger global environment effects like Rain, Snow, or Lightning. (`New in v1.9`)
- **TTS**: Speech output for the avatar. (Supports variables inside braces `{}`)
- **EVENT**: Execute system-defined special events.

---

## 4. Customization Example

```json
"stock": {
    "super_rise": {
        "condition": "change_pct >= 10",
        "actions": [
            { "type": "MOTION", "alias": "joy" },
            { "type": "TTS", "template": "{name} is going crazy! It's surging by {change_pct}%!" }
        ]
    }
}
```

*Last Updated: 2026-02-27*
