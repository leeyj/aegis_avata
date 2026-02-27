# AEGIS 시스템 모듈 상세 기능 명세서 (Module Spec)

이 문서는 AEGIS Intelligence Dashboard 프로젝트의 각 파이썬 모듈별 기능과 함수 호출 방식을 상세하게 정리한 기술 문서입니다.

---

## 📁 각 모듈별 기술 문서 (Specifications)

### 1. 🌐 Routes (웹 요청 및 API 핸들러)
*   [**StudioRoute**](./routes/studio.md): 라이브2D 스튜디오 에디터 및 시뮬레이터 API.
*   [**Config & Decorators**](./routes/config_decorators.md): 전용 설정 경로 및 보안 인증 처리.

### 2. ⚙️ Services (핵심 비즈니스 로직)
*   [**StudioService**](./services/studio_service.md): 테스트 모델 관리 및 실운영 배포 엔진.
*   [**BriefingManager**](./services/briefing_manager.md): AI 브리핑 생성 및 선제적 알림 시스템 총괄.
*   [**GeminiService**](./services/gemini_service.md): Google Gemini API 연동 및 자연어 처리.
*   [**YTMusicService**](./services/ytmusic_service.md): 유튜브 뮤직 API를 통한 미디어 스트리밍 관리.
*   [**WeatherService**](./services/weather_service.md): 실시간 날씨 데이터 수집 및 상태 매핑.
*   [**Stock & Finance Service**](./services/stock_finance_service.md): 국내외 주식 및 글로벌 경제 지수 데이터 분석.

### 3. 🛠️ Utils & Root (공통 유틸리티 및 코어)
*   [**Utils**](./utils/utils.md): JSON 입출력, 보안 검증, 모델 탐색 공통 함수.
*   [**Root Core Modules**](./root/core_modules.md): `gods.py`, `app_factory.py` 등 서버 구동 핵심 모듈.

---

## 💡 문서 활용 팁
- 새로운 기능을 추가하거나 기존 로직을 수정할 때 해당 모듈의 명세서를 참고하여 표준 함수 호출 방식을 준수하십시오.
- `Sponsor` 배지가 붙은 기능은 `utils.is_sponsor()` 검증이 필수적으로 수반되어야 합니다.
- 모든 API 요청은 `@login_required` 데코레이터를 통해 보호됨을 원칙으로 합니다.
