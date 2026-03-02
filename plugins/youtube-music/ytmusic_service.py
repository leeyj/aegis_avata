from ytmusicapi import YTMusic
import os
import json


class YTMusicService:
    def __init__(self, auth_path=None):
        self.yt = None
        # JSON 형식의 인증 파일 경로 정의
        self.json_auth_path = auth_path.replace(".txt", ".json")

        print(f"[YTMusic] Initializing... (Auth path: {auth_path})", flush=True)
        if auth_path and os.path.exists(auth_path):
            try:
                # 1. raw 텍스트 파일(Key: Value)을 파싱하여 딕셔너리로 변환
                headers = {}
                with open(auth_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if ":" in line:
                            parts = line.split(":", 1)
                            headers[parts[0].strip()] = parts[1].strip()

                if headers:
                    # 2. 파싱된 헤더를 JSON 파일로 저장 (ytmusicapi 공식 호환 방식)
                    with open(self.json_auth_path, "w", encoding="utf-8") as f:
                        json.dump(headers, f, indent=4)

                    # 3. 생성된 JSON 파일을 통해 객체 생성
                    self.yt = YTMusic(self.json_auth_path)
                    print(
                        f"[YTMusic] Auth successful. JSON profile created: {self.json_auth_path}",
                        flush=True,
                    )
                else:
                    print(
                        "[YTMusic] No valid headers found. Using unauthenticated mode.",
                        flush=True,
                    )
                    self.yt = YTMusic()
            except Exception as e:
                print(
                    f"[YTMusic] Auth Init Error: {e}. Falling back to unauth.",
                    flush=True,
                )
                self.yt = YTMusic()
        else:
            print(
                "[YTMusic] Auth file missing. Using unauthenticated mode.", flush=True
            )
            self.yt = YTMusic()

    def get_my_playlists(self):
        """내 라이브러리의 플레이리스트 목록 가져오기"""
        if not self.yt:
            print("[YTMusic] Service not initialized", flush=True)
            return []
        try:
            print("[YTMusic] Fetching library playlists...", flush=True)
            playlists = self.yt.get_library_playlists(limit=20)
            print(f"[YTMusic] Found {len(playlists)} playlists", flush=True)
            return playlists
        except Exception as e:
            print(f"[YTMusic] get_library_playlists Error: {e}", flush=True)
            return []

    def get_playlist_tracks(self, playlist_id):
        """특정 플레이리스트의 곡 목록 가져오기"""
        try:
            print(f"[YTMusic] Loading tracks for playlist: {playlist_id}", flush=True)
            playlist = self.yt.get_playlist(playlist_id, limit=20)
            tracks = [
                {
                    "videoId": t["videoId"],
                    "title": t["title"],
                    "artist": t["artists"][0]["name"]
                    if t.get("artists")
                    else "Unknown",
                    "thumbnail": t["thumbnails"][-1]["url"]
                    if t.get("thumbnails")
                    else "",
                }
                for t in playlist.get("tracks", [])
            ]
            print(f"[YTMusic] Successfully loaded {len(tracks)} tracks", flush=True)
            return {
                "title": playlist.get("title"),
                "tracks": tracks,
            }
        except Exception as e:
            print(f"[YTMusic] Error loading playlist {playlist_id}: {e}", flush=True)
            return None

    def search_tracks(self, query):
        """곡 검색"""
        try:
            results = self.yt.search(query, filter="songs")
            return [
                {
                    "videoId": r["videoId"],
                    "title": r["title"],
                    "artist": r["artists"][0]["name"]
                    if r.get("artists")
                    else "Unknown",
                }
                for r in results[:10]
            ]
        except:
            return []


from routes.config import DEFAULT_AUTH_PATH

# 싱글톤 인스턴스 생성
yt_service = YTMusicService(auth_path=DEFAULT_AUTH_PATH)
