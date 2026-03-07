import json
import re
import os
from ytmusicapi import YTMusic
from routes.config import DEFAULT_AUTH_PATH


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

    def update_auth_text(self, raw_text):
        """headers_auth.txt를 갱신하고 서비스를 재초기화 (curl 또는 raw header 대응)"""
        try:
            headers = {}
            # 1. curl 명령어 패턴인 경우
            if "curl" in raw_text.lower():
                # -H 'Key: Value' 또는 -H "Key: Value" 추출
                h_matches = re.findall(
                    r"-(?:H|--header)\s+['\"]([^:]+):\s*(.*?)['\"]", raw_text, re.I
                )
                for k, v in h_matches:
                    headers[k.strip()] = v.strip()

                # -b 'key=val' 또는 --cookie "key=val" 추출
                b_matches = re.findall(
                    r"-(?:b|--cookie)\s+['\"](.*?)['\"]", raw_text, re.I
                )
                if b_matches:
                    headers["Cookie"] = b_matches[0].strip()

            # 2. 일반 텍스트 파싱
            if not headers:
                lines = [line.strip() for line in raw_text.splitlines() if line.strip()]

                # Case A: "Key: Value" 형식
                for line in lines:
                    if ":" in line and not line.startswith(":"):
                        parts = line.split(":", 1)
                        headers[parts[0].strip()] = parts[1].strip()

                # Case B: 줄바꿈으로 구분된 형식 (Key \n Value)
                if not headers and len(lines) >= 2:
                    for i in range(0, len(lines) - 1, 2):
                        k, v = lines[i], lines[i + 1]
                        # 헤더 이름 후보 검증 (공백 없고 너무 길지 않음)
                        if re.match(r"^[a-zA-Z0-9\-]+$", k) and len(k) < 40:
                            headers[k] = v

            if headers:
                # 파싱된 결과를 표준 형식(Key: Value)으로 다시 텍스트 파일에 저장
                from routes.config import DEFAULT_AUTH_PATH

                clean_text = "\n".join([f"{k}: {v}" for k, v in headers.items()])
                with open(DEFAULT_AUTH_PATH, "w", encoding="utf-8") as f:
                    f.write(clean_text)

                # JSON 파일 갱신
                with open(self.json_auth_path, "w", encoding="utf-8") as f:
                    json.dump(headers, f, indent=4)

                # 서비스 재초기화
                self.yt = YTMusic(self.json_auth_path)
                print(
                    f"[YTMusic] Service re-initialized with smart parsing ({len(headers)} headers).",
                    flush=True,
                )
                return True

            print(f"[YTMusic] No headers extracted from provided text.", flush=True)
            return False
        except Exception as e:
            print(f"[YTMusic] Smart Update Auth Error: {e}", flush=True)
            return False

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
        except Exception as e:
            print(f"[YTMusic] search_tracks Error: {e}", flush=True)
            return []


# 싱글톤 인스턴스 생성
yt_service = YTMusicService(auth_path=DEFAULT_AUTH_PATH)
