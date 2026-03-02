# AEGIS Intelligence - 통합 개발 로드맵 (ROADMAP)

**현재 배포 버전**: **v1.8 Condition Watch & Type System (2026-03-02)**
**상태**: 🧩 Plugin-X 조건 감시 루틴 구현 완료. exports 스펙 확정 및 4개 플러그인 manifest 업데이트 완료.

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
*   **미완료**: stock API 필드 매핑 검증, 루틴 편집 후 복원 정합성 회귀 테스트.

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

### 🏗️ v1.9: Connectivity & Knowledge Hub [차기 과제]
- **의존성 관리자 (Dependency Manager)**: 플러그인별 Python 라이브러리 자동 감지 및 설치 인터랙션.
- **로컬 미디어 싱크**: YouTube 외 로컬 MP3 자원 연동 및 비주얼라이저 동기화 고도화.
- **반응형 그리드 엔진**: 모바일/태블릿을 위한 유동적 위젯 재배치 로직.

### 🧬 v2.0: AI Agent Personality & Learning
- **개인지식 학습 엔진 (PKM RAG)**: 노션 데이터를 넘어서는 장기 기억 비서화.
- **멀티 아바타 자동 전환**: 상황(시간대, 기분)에 따른 페르소나 자동 오카스트레이션.

---

**최종 업데이트: 2026-03-02 (v1.8)**
*모든 상세 기술 명세는 `docs/SPECIFICATION.md`를 참조하십시오.*
