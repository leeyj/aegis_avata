# 🎨 AEGIS Live2D Studio Guide v1.9

AEGIS Live2D Studio is a professional development environment where you can safely test and optimize avatars (Live2D models) before applying them to the system. It supports unlimited custom alias creation following `v1.9` standards.

---

## 1. Key Features

### 1.1 Model Browser
- Automatically scans all models in the `test_models/` directory.
- Selecting a model loads it on the screen in real-time to check its appearance and basic actions.

### 1.2 Intelligent Alias Manager
- Maps file names to avatar motions (Idle, Joy, Sad, etc.) so the AEGIS system can control them via commands.
- **Intelligent Inference**: Uses the `check_assets.py` engine to automatically find appropriate motions and generate `alias.json` even from complex Japanese/Chinese file names.
- **Manual Editing**: Allows manual selection and saving of files for fine-tuning.
- **💡 Custom Alias**: Define your own aliases (e.g., `dance`, `wink`) beyond system defaults (`idle`, `joy`, etc.) to call them from widget plugins or the reaction engine.

### 1.3 Reaction Simulator
- Tests various system reactions configured in `reactions.json` (e.g., stock surge, new email arrival).
- Instantly verify which expressions, lines, and motions the avatar performs when an event is triggered.

### 1.4 One-Click Production Deployment (Apply to Production)
- Copies tested models to the `models/` (production) folder with a single click.
- Immediately updates and applies the setting as the main dashboard avatar.

---

## 2. Recommended Workflow

1.  **Prepare Model**: Place a new Live2D model folder under `test_models/`.
2.  **Access Studio**: Click `LIVE2D STUDIO` in the dashboard sidebar.
3.  **Configure Alias**: In the `Alias Manager` tab, run `Intelligent Match` or manually link motions like `idle` and `joy`, then click `Save Alias`.
4.  **Simulation**: Trigger events in the `Simulator` tab to check if the avatar's reactions are natural.
5.  **Apply to Production**: Once satisfied, click `Apply to Dashboard` to appoint the avatar as your official assistant.

---

## 3. Related File Structure

- `test_models/`: Repository for models undergoing development and testing.
- `models/`: Repository for models currently used on the dashboard.
- `alias.json`: Created inside the model folder, acting as a map connecting AEGIS commands to actual motion files (.motion3.json).

---
> [!TIP]
> If file names are too obscure for automatic inference, renaming them to patterns like `idle_01.motion3.json` or `joy_01.motion3.json` will help the engine find them more accurately.
