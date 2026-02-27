# Root Core 모듈 기능 명세서

프로젝트 루트에 위치한 `gods.py`와 `app_factory.py`는 애플리케이션의 시작점과 설정을 담당하는 가장 중요한 파일들입니다.

---

## 🚀 `gods.py` (Entry Point)
*   **기능**: Flask 애플리케이션 서버를 실제로 구동하는 진입점 스크립트입니다.
*   **주요 역할**:
    - `app_factory`를 통해 생성된 `app` 인스턴스를 가져옵니다.
    - `PyInstaller` 등으로 실행될 때의 경로 문제를 해결합니다.
    - 서버 호스트(`0.0.0.0`)와 포트(`8001`)를 설정하고 실행합니다.
*   **실행 방법**:
    ```bash
    python gods.py
    ```

---

## 🏭 `app_factory.py` (App Configurator)
*   **기능**: Flask 앱 객체를 생성하고, 각종 블루프린트 등록 및 전역 설정을 수행합니다.

### 주요 함수: `create_app()`
1.  **SECRET_KEY 설정**: 세션 및 보안을 위한 키를 설정합니다.
2.  **블루프린트 등록**:
    - `main_bp`, `auth_bp`, `widget_bp`: 대시보드 및 인증 핵심 기능
    - `studio_bp`: 라이브2D 스튜디오 기능
    - `ai_bp`, `music_bp`, `wallpaper_bp`: 부가 서비스 및 연동 기능
3.  **정적 파일 경로**: `test_models/` 폴더를 외부에서 접근 가능한 static 엔드포인트로 연결하여 개발 편의성을 높입니다.

---

## 🏠 `auth_helper.py` (Security Tool)
*   **기능**: 구글 캘린더, 지메일 등 구글 API를 사용하기 위해 로컬 환경에서 OAuth 인증 토큰을 생성하고 관리하는 보조 도구입니다. **보안을 위해 `.gitignore`에 등록되어 배포 시 제외됩니다.**
