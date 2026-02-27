# Config & Decorators 모듈 기능 명세서

`routes/config.py`와 `routes/decorators.py`는 전용 설정 경로 관리와 보안 인증을 책임집니다.

---

## 🏗️ `routes/config.py` (Central Configuration)
*   **기능**: 프로젝트 내 모든 JSON 설정 파일, API 토큰, 정적 자산의 절대 경로를 관리하고 초기 비밀 설정을 로드합니다.
*   **주요 변수**:
    - `BASE_DIR`: 프로젝트 루트의 절대 경로.
    - `MODELS_DIR` / `TEST_MODELS_DIR`: 실운영 및 테스트용 라이브2D 폴더 경로.
    - `*_CONFIG_PATH`: `config/` 내의 모든 설정 파일 경로 상수.
    - `GEMINI_API_KEY`: `secrets.json`에서 로드된 AI 서비스 키.
    - `USER_CREDENTIALS`: 로그인에 필요한 사용자 ID/PW 정보.

---

## 🏗️ `routes/decorators.py` (Security Decorators)
*   **기능**: 특정 라우트에 접근하기 전 인증 여부를 확인하는 미들웨어(데코레이터) 역할을 수행합니다.

### 1. `@login_required`
*   **기능**: 세션 내에 `user_id`가 저장되어 있는지 확인합니다. 로그인되지 않은 사용자가 접근하면 즉시 로그인 페이지(`/login`)로 리다이렉트시킵니다.
*   **사용 예시**:
    ```python
    @main_bp.route("/")
    @login_required # 이 데코레이터를 추가하면 보호된 페이지가 됩니다.
    def index():
        ...
    ```
