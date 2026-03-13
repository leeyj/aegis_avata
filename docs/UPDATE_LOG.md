# AEGIS Intelligence - 업데이트 로그 (UPDATE LOG)

## [v4.0.1] Emergency Security Patch & Asset Inclusion (2026-03-12)

### 🚀 주요 변경 사항 (Core Updates)

1. **보안 코어 소스 보호 (Source Hardening)**
   - `core_security.py` 및 `utils.py` 소스 코드를 원격 저장소에서 제거하고, 대신 컴파일된 바이너리(`.pyd` for Windows, `.so` for Linux)만 릴리즈하여 핵심 로직 및 스폰서 권한 시스템을 보호했습니다.
   - `.gitignore`를 강화하여 보안 소스가 실수로 업로드되는 것을 방지했습니다.

2. **사용자 편의성 강화 (Asset Inclusion)**
   - **기본 모델 포함**: `akari_vts`, `hijiki_vts` 모델을 저장소에 포함시켜 신규 사용자가 즉시 테스트할 수 있도록 조치했습니다.
   - **이미지 자산 통합**: 가이드 및 UI 배경을 위한 `img/`, `static/img/` 폴더를 정식 릴리즈에 포함했습니다.

3. **향후 로드맵 수립 (v4.0.1 Roadmap)**
   - 터미널 단축 명령어(`/@`, `/#`) 처리 로직 분석 및 Spine 모델링 지원을 위한 기술 로드맵(`docs/v4.0.1_analysis_roadmap.md`)을 작성했습니다.

---

## [v4.0.0] AEGIS V4 "Plugin-X" Ecosystem Official Release (2026-03-12)

### 🚀 주요 변경 사항 (Core Updates)

1. **공식 메인 브랜치 승격 (Main Release)**
   - AEGIS V4 아키텍처를 `main` 브랜치로 승격하여 공식 릴리즈를 수행했습니다.
   - 기존 v3.8 레거시 코드는 `v3.8-legacy` 브랜치로 분리하여 보존했습니다.

2. **저장소 최적화 (Clean Release)**
   - 2.8GB에 달하던 로컬 데이터를 정밀 스캔하여 불필요한 로그, 임시 파일, 대용량 모델을 제외한 710개의 클린한 파일로 저장소를 최적화했습니다.

3. **UI/UX 폴리싱**
   - 아바타 위치 강제 초기화 기능 제거, 시스템 모니터링 위젯 여백 조정, 스튜디오 창 닫기 버튼 제거 등 실사용 피드백을 반영한 최종 폴리싱을 완료했습니다.

---

## [v4.1.9] Intelligent Alias System & Home Server Deployment (2026-03-12)

### 🚀 주요 변경 사항 (Core Updates)

1. **지능형 명령어 알리아스 시스템 구축 (Language-Native UX)**
   - **폴백 라우팅 도입**: `/주식`, `/일정`, `/메일` 등 별도의 액션 키워드 없이 플러그인 이름만 입력해도 기본 액션(`list`, `brief`, `now` 등)이 자동 실행되는 지능형 폴백 로직을 `router.py`에 구현했습니다.
   - **전수 매니페스트 보강**: `calendar`, `notion`, `stock`, `system-stats`, `terminal`, `gmail`, `todo`, `alarm` 등 11개 주요 위젯의 `manifest.json`에 한국어 명령어 알리아스를 전수 주입했습니다.
   - **신규 액션 등록**: 액션이 없던 `mp3-player`(음악 목록)와 `clock`(현재 시간) 위젯에 액션을 신규 구현하고 시스템에 정식 등록했습니다.

2. **홈 서버(Phase 2) 배포 자동화 및 동기화**
   - **배포 스크립트 최적화**: `deploy_home.py`를 통해 로컬의 강화된 설정과 바이너리 모듈을 192.168.0.20 서버로 일괄 배포했습니다.
   - **설정 동기화**: `settings.json`의 최신 레이아웃 정보를 홈 서버 환경과 안전하게 동기화하고 배포 후 자동 보호 조치를 완료했습니다.

3. **시스템 안정화 (Bug Zero Initiative)**
   - **Gmail 연동 복구**: 매니페스트 누락으로 작동하지 않던 Gmail(/메일) 명령어를 최신 규격으로 완전히 복구했습니다.
   - **중복 에러 메시지 제거**: 명령어 오타 시 "명령어 명령어"와 같이 중복 출력되던 UI 버그를 수정했습니다.

---

## [v4.1.1] Iframe Architecture Stabilization (2026-03-10)

### 🚀 주요 변경 사항 (Core Updates)

1. **터미널 아키텍처 및 디자인 전면 리뉴얼 (Standard Widget Pivot)**
   - **퀘이크 스타일 폐기**: Iframe 격리 환경에서의 포커스 유실 및 레이아웃 간섭을 근본적으로 해결하기 위해 '상단 슬라이드' 방식을 폐기하고 **표준 드래그/리사이즈 가능한 위젯**으로 전환했습니다.
   - **프리미엄 UI 적용**: 짙은 그라파이트 테마와 사이언 네온 광 효과를 활용한 고해상도 디자인을 적용하여 V4의 미래지향적 감각을 극대화했습니다.
   - **가시성 프로토콜 통합**: 터미널 전용 하드코딩 애니메이션 로직을 제거하고, 코어의 `WIDGET_VISIBILITY_CHANGED` 표준 규격으로 일원화했습니다.

2. **AI 모델 선택 및 아바타 연동 오류 수정 (Protocol Fix)**
   - 터미널 내 AI 모델 선택 시 아바타(Live2D) 모델 변경 API(`CHANGE_MODEL`)가 잘못 호출되어 발생하던 404 에러와 충돌 문제를 해결했습니다.
   - AI 선택과 아바타 선택 메시지 채널을 완전히 분리하여 시스템 안정성을 확보했습니다.

3. **Iframe 인터랙션 최적화 (UX Hardening)**
   - **자동 포커스 주입**: 터미널 활성화 시 코어 레벨에서 즉시 Iframe 내부로 포커스를 강제 주입하여 별도 클릭 없이 즉시 입력이 가능하도록 개선했습니다.
   - **전역 단축키 보강**: `Shift + ~` (토글) 및 `ESC` (닫기) 단축키가 호스트와 Iframe 어디에서든 확실하게 반응하도록 메시지 라우팅을 강화했습니다.

---

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

---

## [Roadmap] Desktop Accessory & Minimal Mode Vision

### 🕒 차기 주요 과제 (Next Focus)

1. **데스크톱 액세서리 고도화 (Electron Optimization)**
   - **미니멀 모드 도입**: 상시 노출되는 위젯을 최소화하고, 아바타와 **말풍선(Speech Bubble)** 중심의 알림 체계로 전환하여 화면 간섭을 최소화하는 비전 수립.
   - **투명도 및 깨짐 이슈 근본 해결**: 하드코딩된 블러(`backdrop-filter`) 배제 및 하드웨어 가속 제어를 통한 안정적인 투명 UI 구현.
   - **동적 마우스 패스스루(Mouse-Through)**: 위젯 영역 외에는 바탕화면 클릭이 통과되도록 Electron의 `setIgnoreMouseEvents`와 AEGIS의 위젯 좌표 데이터를 실시간 동기화.

2. **말풍선 중심의 인터랙션 단일화**
   - 디스코드/터미널 명령의 결과를 복잡한 위젯 대신 캐릭터의 음성과 말풍선으로 즉시 출력하는 '경량화된 개인 비서' UX 구축.

---

*이전 버전의 로그는 `UPDATE_LOG_v3.md`에서 확인하실 수 있습니다.*
