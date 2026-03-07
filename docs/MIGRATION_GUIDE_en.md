# AEGIS v1.6~1.8 ➔ v1.9 Migration Guide (Clean Install Recommended)

Updating from versions 1.8 and below to version 1.9 (Weather Dynamics & UI Lock Integration) involves significant improvements in system architecture, stability, and security standards.
To avoid conflicts with old files ("Zombie Files"), we recommend a **Clean Install** (backing up existing data and performing a fresh installation) rather than an overwrite or simple `git pull`. v1.9 specifically introduces new environment effect assets.

---

## 🚀 3-Step Guide for Perfect Migration

### Step 1: Back up Critical Data
Copy the following items from your current `gods` folder to a safe location (e.g., your desktop).
(AEGIS stores all personal authentication/local information only in the paths below, excluding core code.)

* **Entire `config/` directory**
  * Includes account info (`secrets.json`), Google credentials (`credentials.json`, token files), weather, and scheduler settings.
* **Entire `models/` and `test_models/` directories** (if they exist)
  * Includes Live2D avatar models and Alias configurations you've added and mapped in the Studio.
* **`headers_auth.txt` file** (if it exists)
  * Cookie information saved for YouTube Music playback.

### Step 2: Download the New System (Clean Install)
Boldly delete your existing `gods` folder or rename it (e.g., `gods_old`).
Then, download the new version of the `gods` system via `git clone` or by downloading the latest release files.

### Step 3: Restore Backups and Run
Copy the folders (`config/`, `test_models/`) and files (`headers_auth.txt`) you backed up in Step 1 and **overwrite/paste** them into the newly downloaded `gods` folder.

Now, run `python app.py` (or your local/home server startup command) in the terminal.
Your old user settings and authentication status will be perfectly integrated into version 1.9 without the need for migration tools or cumbersome configurations! Welcome back!
Starting from v1.9, you can lock or unlock widget placement using the **padlock icon** next to the logo at the top of the dashboard. Be sure to check it out!
