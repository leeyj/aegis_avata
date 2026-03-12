# AEGIS Intelligence - 통합 개발 로드맵 (ROADMAP)

**현재 배포 버전**: **v3.7.0 Deterministic Actions & BotManager Integration - 2026-03-08**
**상태**: 🚀 확정적 명령어 체계(Deterministic Actions) 및 BotManager 중앙 통제 시스템 구축 완료.

---

## 🚀 현재 시스템 현황 (Current Progress)

### 1. ⚡ 확정적 명령어 체계 (Deterministic Actions v3.7.0) — [100% 완료] ✨NEW
*   **Determinism First**: `/` 명령어 입력 시 AI 판단 이전에 `manifest.json`에 정의된 액션을 우선적으로 매칭 및 실행.
*   **Bilingual & Shorthand**: 한국어/영어/단축키(예: `재생`, `play`, `p`)를 모두 지원하는 명령어 역발행 인덱스 구축.
*   **Auto-Registration**: 플러그인 로드 시 `manifest.json` 내의 `actions` 필드를 분석하여 `BotManager`에 자동 등록.
*   **Sync Command (HUD)**: 액션 실행 후 `sync_cmd`를 통해 데스크탑 HUD와 실시간 상태 동기화 지원.

### 2. 🧠 BotManager 중앙 통제 (Systemic Integration) — [100% 완료]
*   **Unified Gateway**: 모든 플랫폼(Web, Discord, CLI 등)의 메시지를 `BotManager`가 중앙에서 분석 및 라우팅.
*   **Priority Routing**: 시스템 명령어 > 확정적 액션 > AI 하이브리드(@) > AI 폴백 순의 정교한 라우팅 로직.
*   **Action Prompt Injection**: 등록된 액션 정보를 AI 프롬프트에 동적으로 주입하여 실행 정확도 극대화.

### 3. 🧩 Plugin-X 플랫폼화 (Full Modularity) — [100% 완료]
*   **Zero Hardcoding**: 모든 위젯과 기능이 `/plugins` 폴더에서 동적으로 로드 및 초기화.
*   **context.environment**: 플러그인이 시스템 환경 효과(날씨 등)를 직접 제어할 수 있는 API 제공.
*   **Initialize Standard**: 각 플러그인의 `router.py` 내 `initialize_plugin()` 함수를 통한 표준화된 초기화 패턴 수립.

### 4. 🛡️ 보안 및 인프라 (Security & Infra) — [100% 완료]
*   **Dynamic CSP**: `manifest.json` 기반의 자동 도메인 화이트리스팅 및 보안 헤더 적용.
*   **Extreme Cache (AXC)**: IndexedDB 기반 SHA256 해시 검증형 로컬 캐싱 엔진.
*   **Parallel Hydration**: 플러그인 자원의 비동기 병렬 로딩을 통한 초기 기동 속도 최적화.

---

## 📅 향후 고도화 계획 (Future Roadmap)

### 🏗️ v3.8.x: Core Modularization & Scalability [진행 중] ✨NEXT
- **BotManager Decomposition**: 비대해진 `bot_gateway.py`를 기능별(Router, Auth, Handler, AI) 모듈로 분리.
- **WebSocket High-Availability**: 다중 클라이언트 접속 시 상태 동기화 및 메시지 큐 안정화.
- **Plugin Dependency Visualizer**: 플러그인 간의 데이터 의존성 및 호출 구조 시각화 도구 제공.

### 🎨 v4.0.x: Advanced Media & Intelligence
- **로컬 미디어 싱크 (Local Media Sync)**: 시스템 오디오와 비주얼라이저의 실시간 픽셀 동기화.
- **반응형 그리드 엔진 (Responsive Grid Engine)**: 모기기별 최적화된 위젯 배치 자동화.
- **멀티 터치 액션 (Multi-Touch Interface)**: HUD 아바타와의 직접적인 터치/드래그 인터랙션 강화.

---

**최종 업데이트: 2026-03-08 (v3.7.0 확정적 명령어 체계 반영)**
*모든 상세 기술 명세는 `docs/SPECIFICATION.md`를 참조하십시오.*
