# 🎵 YouTube Music Guide

AEGIS provides intelligent background music (BGM) control by integrating with your YouTube Music account.

![YouTube Music](/static/img/user_guide_youtube_music.png)

## ✨ Key Features
- **Background BGM**: Fetch and play music from your playlists or queues in real-time.
- **Animation Sync**: Visual effects where the avatar moves or dances in sync with the music's rhythm. (Advanced features planned for sponsors)
- **Terminal Control**: Issue commands like play, stop, and next track through the terminal HUD.

## ⚙️ Setup Guide (Initial Setup)
YouTube Music integration requires your account's authentication header information.

1. Log in to [YouTube Music](https://music.youtube.com/) in your PC browser.
2. Press `F12` to open Developer Tools and go to the **Network** tab.
3. Refresh the page (`F5`) and click on the topmost request (usually `browse`).
4. In the **Headers** tab, find the **Request Headers** section and copy the `Cookie` and `Authorization` values.
5. Paste these values into the `headers_auth.txt` file in the project root folder. (Refer to `headers_auth.example.txt` for the format)

## ⌨️ Commands
- `유튜브 재생`: Start music playback
- `음악 정지`: Pause music
- `다음 곡`: Move to the next track
- `@youtube [search term]`: Search and play specific songs or playlists

> [!TIP]
> A YouTube Music Premium account is recommended for more stable streaming and better animation synchronization.
