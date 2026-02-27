# Dashboard & Widgets 모듈 기능 명세서

`routes/main.py`, `routes/auth.py`, `routes/widgets.py` 등 대시보드 UI와 위젯 데이터 통신을 담당하는 모듈들에 대한 명세입니다.

---

## 🏗️ 1. `routes/main.py` (Main Entry)
*   **기능**: 대시보드의 메인 페이지를 렌더링하고 위젯 전체에 필요한 기본 컨텍스트 데이터를 제공합니다.
*   **함수**: `index()`
    - `@login_required` 데코레이터를 통해 보호됩니다.
    - `settings.json`에서 마지막 사용 모델(`last_model`) 정보를 읽어와 아바타를 로드하도록 지시합니다.

---

## 🏗️ 2. `routes/auth.py` (Authentication)
*   **기능**: 사용자 로그인 및 로그아웃과 관련된 인증 로직을 처리합니다.
*   **함수**: 
    - `login()`: 사용자가 입력한 ID/PW를 `config/_secrets` 데이터와 대조하여 검증합니다. 성공 시 세션에 `user_id`를 기록합니다.
    - `logout()`: 현재 사용자의 세션을 만료시키고 보안 연결을 해제합니다.

---

## 🏗️ 3. `routes/widgets.py` (Widget Data API)
*   **기능**: 대시보드상의 각 위젯(날씨, 일정, 주식, 뉴스 등)이 필요로 하는 실시간 데이터를 개별적인 API 엔드포인트로 제공합니다.
*   **주요 엔드포인트**:
    - `/api/summary`: 전체 위젯의 실시간 데이터를 집계하여 한꺼번에 반환 (AI 브리핑용).
    - `/api/weather`: 실시간 기상 상태 및 기온 데이터 반환.
    - `/api/calendar`: 구글 캘린더의 일정 이벤트를 조회하여 반환.
    - `/api/news`: 네이버 및 RSS 뉴스를 수집하여 반환.
    - `/api/briefing`: `BriefingManager`를 호출하여 생성된 오늘의 AI 전술 보고서를 반환.

---

## 🏗️ 4. `routes/ai.py` (AI Assistant)
*   **기능**: 사용자의 음성 및 텍스트 명령을 `Gemini`로 전달하고 결과를 처리합니다.
*   **함수**: `get_ai_response()`
    - 사용자의 커맨드에 따라 시스템 액션을 트리거하거나 아바타의 감정 상태(Sentiment)를 업데이트하는 중추 역할을 합니다.
    - `is_sponsor()` 여부에 따라 AI 분석의 깊이나 우선순위가 차등 적용될 수 있습니다.

---

## 🏗️ 5. 기타 모듈 (`models.py`, `music.py`, `wallpaper.py`)
*   `models.py`: 실운영 모델(`models/`)의 정적 자산 서빙을 담당합니다.
*   `music.py`: 유튜브 뮤직 곡 검색 및 재생 목록 관리를 위한 API 엔드포인트를 제공합니다.
*   `wallpaper.py`: 대시보드 배경화면 이미지 변경 및 다이나믹 배경 로직을 관리합니다.
