# StudioRoute 모듈 기능 명세서

`routes/studio.py` 모듈은 Live2D 스튜디오의 모든 웹 요청과 API 엔드포인트를 정의합니다. 

---

## 🏗️ 블루프린트: `studio_bp` (접두사 없음)

### 1. `/studio` (GET)
*   **기능**: 메인 스튜디오 에디터 및 시뮬레이터 페이지(`studio/index.html`)를 렌더링합니다.
*   **인증 권한**: `@login_required` + `is_sponsor()` (스폰서 비회원은 403 Forbidden).
*   **함수**: `studio_index()`
*   **반환값**: HTML (렌더링된 스튜디오 UI)

---

## 🛠️ API 엔드포인트 (`/studio/api/...`)

### 1. `/studio/api/models` (GET)
*   **기능**: 사용 가능한 모든 테스트 모델 리스트를 JSON 형태로 반환합니다.
*   **권한**: `@login_required`
*   **함수**: `list_studio_models()`
*   **반환값**: `['akari_vts', 'news_girl', ...]`

### 2. `/studio/api/model_info/<name>` (GET)
*   **기능**: 특정 모델의 모든 파일 정보(모션, 표정, 필드명 등)를 조회합니다.
*   **권한**: `@login_required`
*   **함수**: `studio_model_info(name)`
*   **반환값**: `model_info` JSON 객체

### 3. `/studio/api/save_alias/<name>` (POST)
*   **기능**: 웹 UI에서 작업한 `alias.json` 데이터를 서버에 영구적으로 저장합니다.
*   **권한**: `@login_required` + **스폰서 전용 확인**
*   **함수**: `studio_save_alias(name)`
*   **반환값**: `{ "status": "success", "message": "..." }`

### 4. `/studio/api/apply_model/<name>` (POST) 💎
*   **기능**: 현재 테스트 모델을 실제 운영 환경으로 배포하고 대시보드 설정을 업데이트합니다.
*   **권한**: `@login_required` + **스폰서 전용 확인**
*   **함수**: `studio_apply_model(name)`
*   **반환값**: `{ "status": "success", "message": "..." }`

### 5. `/studio/api/reactions` (GET)
*   **기능**: 브라우저의 전용 시뮬레이터 UI 구성을 위해 `reactions.json` 데이터를 제공합니다.
*   **권한**: `@login_required`
*   **함수**: `studio_get_reactions()`
*   **반환값**: `reactions` JSON 데이터

---

## 📁 정적 자산 서빙 (Static Serving)

### 1. `/studio/models/<path:filename>` (GET)
*   **기능**: `test_models/` 폴더 내에 있는 실제 모델 파일(moc3, json, png 등)을 브라우저(PixiJS)가 읽을 수 있도록 서빙합니다.
*   **함수**: `serve_studio_models(filename)`
*   **내부 로직**: `send_from_directory(TEST_MODELS_DIR, filename)`
