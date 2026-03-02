# AEGIS Intelligence - 통합 개발 로드맵 (ROADMAP)

**현재 배포 버전**: **v1.9 Environment Dynamics & UI Controls (2026-03-03)**
**상태**: ⛈️ 전역 환경 효과(Weather Effects) 및 🔓 UI 잠금/해제 기능 구현 완료. v1.9 문서 현행화 완료.

---

## 🚀 현재 시스템 현황 (Current Progress)

### 1. 🧩 Plugin-X 플랫폼화 (Full Modularity) — [100% 완료]
*   **Zero Hardcoding**: 모든 위젯이 `/plugins` 폴더에서 동적으로 로드됩니다.
*   **Shadow DOM 격리**: 위젯 간 스타일/스크립트 충돌 원천 차단.
*   **백엔드 독립성**: 각 플러그인이 자체 Blueprint와 API를 보유 (라우트 기반 격리).

### 2. 🛡️ 보안 및 인프라 (Security & Infra) — [90% 진행]
*   **Dynamic CSP**: `manifest.json` 기반의 자동 도메인 화이트리스팅.
*   **Cross-Platform Fix**: Windows 환경 MIME 타입 서빙 버그 해결.
*   **Persistence**: 사이드바 토글과 실제 위젯 가시성 상태 100% 동기화.

### 3. 🧠 지능형 서비스 (AI Services) — [85% 진행]
*   **Multi-AI Hub**: Grok, Gemini, Ollama 등 상황별 엔진 선택 가능.
*   **Enhanced Briefing**: 타이틀 위젯 내 전술 브리핑 전용 허브 및 스테이터스 피드백 탑재.
*   **End-to-End Logging**: 브리핑 전 과정(분석-수신-출력)의 가시성 확보.

### 4. ⏰ 스케줄러 고도화 (Scheduler v1.8) — [95% 완료] ✨NEW
*   **범용 액션**: `terminal_command`, `api_call` — 어떤 플러그인이든 스케줄 등록 가능.
*   **조건 감시 (Condition Watch)**: 시간이 아닌 데이터 조건(센서 임계치)으로 트리거.
*   **exports manifest 스펙**: 플러그인이 `sensors[]`, `commands[]`를 선언 → GUI 자동 드롭다운.
*   **타입 시스템**: `condition.type`(number/string/boolean) 기반 자동 변환 및 비교.
*   **템플릿 변수**: TTS 텍스트에 `{{value}}`, `{{threshold}}` 삽입 가능.
*   **4개 플러그인 exports 등록**: weather(기온, 습도), stock(KOSPI, 등락률), system-stats(CPU, 메모리), notion(명령어).

### 5. ⛈️ 환경 역동성 & UI 제어 (v1.9) — [100% 완료] ✨NEW
*   **ENVIRONMENT_CONTROL**: 플러그인이 `context.environment.applyEffect()`로 비, 눈, 번개 효과를 트리거.
*   **UI Drag Lock**: 대시보드 상단 인터페이스를 통해 위젯 위치/크기 조절 권한 잠금 및 해제 통합.
*   **Promo Control**: 홍보 및 테스트를 위한 시스템 이벤트 강제 발생기(Console) 탑재.
*   **스폰서 시스템**: README 내 후원 배지 및 후원자 명단 자동 업데이트(GitHub Actions) 연동.

---

## 📅 향후 고도화 계획 (Future Roadmap)

### 💎 v1.8.x: Stabilization & Testing [100% 완료]
- ~~**[T-1] 조건 감시 통합 테스트**: 날씨 온도, CPU 사용률 등 실제 조건 트리거 검증.~~
- ~~**[T-2] stock/system-stats exports 필드 경로 검증**: 실제 API 응답 구조와 manifest 매칭 확인.~~
- ~~**[T-3] 루틴 편집 회귀 테스트**: 조건 루틴 저장 → 재로드 → 편집 시 필드 복원 정합성.~~

### 📖 v1.8.x: Documentation & Polish [100% 완료]
- ~~**공식 문서 고도화**: 핸드오버와 로드맵을 최신 상태로 유지하고, 시스템 구조의 가시성을 높이는 매뉴얼 및 가이드 개편.~~
- ~~README 파일 최신화 및 다국어(영문) 가이드라인/알리아스 부가 설명 추가 완료.~~
- ~~v1.6 환경 사용자를 위한 MIGRATION_GUIDE.md 제공 및 클린 배포 스크립트 작성 완료.~~

### 🏗️ v1.10: Connectivity & Media Sync [차기 과제]
- **의존성 관리자 (Dependency Manager)**: 플러그인별 Python 라이브러리 자동 감지 및 설치 인터랙션.
- **로컬 미디어 싱크**: YouTube 외 로컬 MP3 자원 연동 및 비주얼라이저 동기화 고도화.
- **반응형 그리드 엔진**: 모바일/태블릿을 위한 유동적 위젯 재배치 로직.
- **에너지 세이버 (Eco Mode)**: 게이트키퍼 'Deny' 시간대에 아바타 애니메이션 및 위젯 갱신 주기 자동 최소화.

### 🧬 v2.0: Native Intelligence & Pure Modularity [상위 과제] ✨FUTURE
- **100% Plugin-X Compliance**: 터미널(Terminal), 서치 윈도우(Search) 등 모든 코어 위젯의 플러그인화 및 Shadow DOM 격리.
- **Desktop Native Experience**: PyQt5 기반 투명 배경/항상 위에 모드 공식 지원 (`/desktop` 아키텍처 공식화).
- **Click-through Engine**: 캐릭터/위젯 외 투명 영역의 클릭 이벤트를 OS 바탕화면으로 전달하는 네이티브 인터랙션.
- **Anti-Zombie Policy**: 모든 소스 파일 내 가시적 버전 헤더(`@version`) 의무화 및 시스템 부팅 시 무결성 검사(`Integrity Check`) 도입.
- **Auto-Startup**: 윈도우 부팅 시 시스템 트레이 자동 실행 및 저사양 모드(Static Mode) 최적화.

---

**최종 업데이트: 2026-03-03 (v1.9)**
*모든 상세 기술 명세는 `docs/SPECIFICATION.md`를 참조하십시오.*
