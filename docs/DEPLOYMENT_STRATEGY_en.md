# AEGIS v4.0.0 Deployment & Migration Strategy

This document defines the official strategy for delivering the major update from v3.8 to v4.0.0 (Iframe Isolation Architecture) to existing users and developers. Other AI agents and developers should follow these guidelines for deployment and migration.

## 1. Git Branching & Versioning Policy

| Target | Branch | Version Tag | Note |
|---|---|---|---|
| **Legacy Users** | `legacy-v3-stable` | `v3.8.x` | For users who wish to stay on the v3.x environment |
| **Latest (v4.0)** | `main` | `v4.0.0` | New standard architecture (Iframe/ESM) |
| **Development** | `v4-dev` | `v4.0.0-rc.x` | Feature addition and testing branch |

- **Semantic Versioning**: Since Iframe isolation introduces Breaking Changes, the major version is bumped to **v4.0.0**.
- **Merge Flow**: Before merging the current `gods_v4` work into `main`, preserve the existing `main` state by creating the `legacy-v3-stable` branch.

## 2. User Category Transition Guide

### ① Legacy Users (v3.8 Preservation)
- Users can maintain a compatible environment using `git checkout legacy-v3-stable`.
- Backend dependencies (Python 3.10+) and frontend DOM structures follow v3 standards.

### ② New Users (v4.0 Installation)
- Use the latest `main` branch and start development according to the audited [Plugin-X Guide](Plugin-X_Guide_en.md).
- Use `create_plugin.py` v1.5.0+ to generate V4 standard boilerplates.

### ③ Upgrading Users (v3.8 -> v4.0 Migration)
- **Config Compatibility**: Core fields in `config/secrets.json` and `settings.json` remain compatible in v4.
- **Plugin Transition**: Existing DOM-based plugins will not work in the Iframe isolated environment. They require updating `manifest.json` and applying the Event Delegation pattern as per the migration guide.

## 3. Plugin Compatibility Engine (Plugin-X v4.0)

The system loader (`plugin_loader.js`) determines behavior based on the `engine_version` in `manifest.json`.

- **`engine_version: 3`**: Local DOM injection (Recommended to block loading after a "Deprecated" warning in v4.0).
- **`engine_version: 4`**: Iframe Sandbox + ES Module mode (V4 Standard).

## 4. Execution & Deployment Timeline

1. **Verification**: Perform 2-3 days of real-server load and stability testing on the home server.
2. **Branch Sync**: Create `legacy-v3-stable` branch and manually merge v4 code into `main`.
3. **Official Announcement**: Update `README.md` and record v4.0.0 release in `UPDATE_LOG.md`.

---
**Note to AI Agents**: All plugin development after AEGIS v4.0.0 must assume Iframe isolation and adhere to the absolute path resolution convention via `context.resolve()`.
