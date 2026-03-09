# AEGIS Intelligence - 업데이트 로그 (UPDATE LOG)

## [v3.8.5] Modular Loader & System Hardening (2026-03-09)

### 🚀 주요 변경 사항 (Core Updates)

1. **프론트엔드 코어 모듈화 (Loader/Scheduler Decoupling)**
   - `plugin_loader.js` (약 470라인)를 `static/js/loader/` 폴더 내 4개 모듈(`axc_cache`, `service_bridge`, `plugin_context`, `plugin_renderer`)로 완전 분리했습니다.
   - `briefing_scheduler.js`를 `Gatekeeper`, `TickEngine`, `ActionExecutor` 모듈로 분리하여 코드 가독성과 유지보수성을 극대화했습니다.
   - 모든 핵심 로직을 ES6 모듈(ESM) 방식으로 전환하고 `index.html`에 `type="module"`을 적용했습니다.

2. **시스템 정밀 정리 (Zombie Files Cleanup)**
   - 플러그인화로 인해 더 이상 사용되지 않는 `static/js/widgets/` 내의 레거시 파일들(TTS, Terminal, Visualizer 등 7개 파일)을 로컬 및 홈 서버에서 모두 삭제했습니다.
   - `core.js`와의 네이밍 충돌을 방지하기 위해 모듈 폴더명을 `core/`에서 `loader/`로 변경했습니다.

3. **중요 버그 수정 (Critical Bug Fixes)**
   - **도움말(Help) 플러그인**: 특정 데이터 요청 시 발생하던 `AttributeError` 및 데이터 구조 불일치 문제를 해결했습니다.
   - **언어 불일치(Language Mismatch)**: AI 브리핑 시 특정 상황에서 음성과 텍스트의 언어가 다르게 나오던 현상을 `gemini_service.py` 리팩토링을 통해 수정했습니다.
   - **알람 명령어 실패**: 서비스 플러그인이 부팅 시 누락되어 명령어 라우팅이 중단되던 로직을 수정했습니다.

---

## [v3.8.0] Visual Intelligence & Tactical Help Center (2026-03-09)

### 🚀 주요 변경 사항 (Core Updates)

1. **도움말 센터 콘텐츠 대폭 강화 (README Full-Port)**
   - `README.md`의 핵심 내용(AI 개발, 터미널 HUD, 스튜디오, 노션 등)을 위젯 전용 문서로 이식하고 국/영문 다국어 지원을 완결했습니다.
   - **동적 마크다운 시스템**: 하드코딩된 HTML 대신 `docs/` 폴더 내의 `.md` 파일을 실시간으로 읽어와 렌더링하는 구조로 개편했습니다.
   - **자동 탭 생성 (Auto-Discovery)**: 새로운 마크다운 문서를 추가하기만 하면 위젯 상단에 해당 탭이 자동으로 생성됩니다.

2. **도움말 전용 단축키 도입 (`Shift + H`)**
   - 대시보드 어디서든 `Shift + H`를 눌러 도움말 창을 즉시 토글할 수 있는 UX를 구축했습니다.
   - 입력창 포커스 시 단축키 비활성화 및 사이드바 상태 연동 버그를 수정하여 사용성을 높였습니다.

3. **고해상도 이미지 자산 및 표 스타일 최적화**
   - 이미지를 `static/img`로 중앙 집중화하여 서버 재시작 없이 즉시 노출되도록 개선했습니다.
   - 마크다운 테이블에 테두리, 헤더 강조색, 호버 효과를 추가하여 전술 레퍼런스의 가독성을 극대화했습니다.

4. **명령어 시각적 지원 상태 도입 (⚡/🧠)**
   - Systematic (⚡) 및 Hybrid (🧠) 아이콘을 통해 각 플러그인의 지원 체계를 직관적으로 표시합니다.

---

## [v3.7.2] Architecture Stability & Discord Integration (2026-03-09)

### 🚀 주요 변경 사항 (Core Updates)

1. **디스코드 명령어 시스템 안정화 (`/help`)**
   - 도움말 생성 로직 (`help_manager.py`)에서 발생하던 잠재적 충돌 문제를 해결했습니다.
   - 알리아스 조회 방식을 인덱싱으로 최적화하여 성능을 개선하고, 데이터 누락 시에도 안전하게 폴백되도록 보호 코드를 추가했습니다.
   - 명령어 라우터 (`router.py`)에 플랫폼별 상세 로깅과 예외 처리 경계를 도입하여 시스템 가시성을 높였습니다.

2. **일정 타임라인 위젯 UI 개선 (`timeline-ui`)**
   - Shadow DOM 접근 로직을 AEGIS Plugin-X 표준 규격으로 리팩토링하여 데이터 렌더링 문제를 해결했습니다.
   - 실시간 동기화 기능을 강화하여 일정 변경 시 대시보드에 즉각 반영되도록 개선했습니다.

3. **배포 환경 최적화 (`deploy.py`)**
   - 서버 프로세스 제어 로직을 강화하여 무중단 배포 시 발생하던 오작동을 방지했습니다.
   - 빌드 로그 시각화 및 바이너리 동기화 검증 단계를 추가하여 배포 신뢰도를 높였습니다.

4. **부팅 안정성 및 정적 분석 대응 (Hardening)**
   - `services.bot_gateway` 초기화 시 `BotAdapter` 누락으로 인한 임포트 오류를 해결했습니다.
   - 핵심 유틸리티 (`utils.py`)의 타입 힌트를 표준화하여 IDE 및 린트 도구와의 호환성을 확보했습니다.

---

*이전 버전의 로그는 `UPDATE_LOG_v3.md`에서 확인하실 수 있습니다.*
