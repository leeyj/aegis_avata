# YTMusicService 모듈 기능 명세서

`services/ytmusic_service.py`는 유튜브 뮤직 API(`ytmusicapi`)를 연동하여 사용자의 플레이리스트 조회, 곡 검색 및 재생 목록 관리를 담당합니다.

---

## 🏗️ 클래스: `YTMusicService`

### 1. `__init__(auth_path)`
*   **기능**: 인증 파일을 로드하여 유튜브 뮤직 세션을 초기화합니다.
*   **주요 로직**:
    - 브라우저에서 복사한 `headers_auth.txt` 형식을 읽어 내부 라이브러리 호환용 `headers_auth.json`으로 자동 변환합니다.
    - 인증 파일이 없을 경우 비로그인(Unauthenticated) 모드로 동작합니다.

### 2. `get_my_playlists()`
*   **기능**: 현재 사용자의 유튜브 뮤직 라이브러리에 등록된 플레이리스트 목록을 최대 20개까지 가져옵니다.
*   **반환값**: 플레이리스트 정보 배열.

### 3. `get_playlist_tracks(playlist_id)`
*   **기능**: 특정 플레이리스트의 ID를 기반으로 해당 리스트에 포함된 노래들의 제목, 아티스트, 썸네일 정보를 가져옵니다.
*   **반환 객체**:
    ```json
    {
      "title": "플레이리스트 제목",
      "tracks": [
        { "videoId": "...", "title": "...", "artist": "...", "thumbnail": "..." },
        ...
      ]
    }
    ```

### 4. `search_tracks(query)`
*   **기능**: 키워드를 통해 유튜브 뮤직에서 노래를 검색합니다.
*   **반환값**: 검색 결과 상위 10개의 곡 정보 배열.

---

## 💡 싱글톤 인스턴스: `yt_service`
이 모듈은 파일 하단에서 `yt_service`라는 이름으로 미리 인스턴스화되어 제공됩니다. 다른 모듈에서는 새로 객체를 생성할 필요 없이 `from services.ytmusic_service import yt_service`와 같이 편리하게 임포트하여 사용할 수 있습니다.
