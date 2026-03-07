# AEGIS Notion Intelligence Hub Guide

AEGIS provides a comprehensive **Notion integration solution** that helps you systematically manage fragmented personal knowledge and enables AI to learn from it.

With a single terminal command, you can record your thoughts and experience a smart environment where AI automatically organizes your knowledge and briefs you on it.

---

## 1. Notion API Integration & Setup Guide

To use AEGIS's Notion feature, you must first obtain a Notion admin token and the ID (URL string) of the database you want to connect.

### 1.1 Issuing the API Token (Internal Integration Secret)
1. Go to the [Notion Developers Integration Page](https://www.notion.so/my-integrations).
2. Click the **[New Integration]** button on the left menu.
3. Enter an appropriate name (e.g., `AEGIS`) and save.
4. Once created, copy the **"Internal Integration Secret"** displayed on the screen.
5. In your system configuration file (like `config/secrets.json`), paste the copied token under the `NOTION_API_KEY` environmental variable.

### 1.2 Connecting the Database ID
1. **Grant Permissions**: Open your Notion app or web browser and navigate to the database page you wish to sync.
2. Click the `...` menu on the top right, select **[Connect]**, search for the integration name you created (e.g., `AEGIS`), and add it (grant permissions).
3. **Copy the Database ID**: If you look at the URL in your web browser's address bar (or "Copy link"), there is a UUID string. This is your `Database ID`.
4. Open the `plugins/notion/config.json` file and paste the copied Database ID next to `"id"` in the `"workspaces"` section.

---

## 2. Key Features and Usage

Once correctly configured, you can utilize powerful knowledge hub features via the dashboard and terminal.

### 2.1 Quick Capture
Record notes or tasks to your Notion database instantly via the terminal while browsing the web or looking at the dashboard.
- **Note entry example**: `Open the terminal (Shift + ~) -> /n Finish document draft by this weekend`
- **To-do entry example**: `/todo Buy milk from the mart today`

### 2.2 Multi-Workspace Integration (💎 Sponsor Exclusive)
If you manage multiple Notion databases (e.g., work, personal, clippings), you can register each workspace using an alias.
- Add each space to the `workspaces` list in `notion.json` (or the plugin's `config.json`) and assign an **alias**, such as `@work` or `@personal`.
- Switch targets instantly from the terminal with a single command (e.g., `switch`).

### 2.3 Intelligent Cleanup Rules (💎 Sponsor Exclusive)
AI automatically reclassifies storage and changes the properties of user-written notes or articles according to pre-defined rules.
- Example: Analyzes keywords in the title (e.g., `[Discard]`, `Meeting Notes`) to move folders or set tags.
- Setup: Define trigger conditions and Action classifications in `notion_rules.json`.

### 2.4 AI Knowledge Briefing
AI searches and systematizes recently recorded notes and databases to verbally brief the user via TTS. This is very useful for tracking progress and identifying priorities.
- Uses a Custom RAG (Retrieval-Augmented Generation) approach to dynamically feed Notion data into the prompt. (Refer to v2.2.0 updates)

---
*This guide was compiled by referencing the Notion section of the official [AEGIS README.md](../../README.md).*
