# AEGIS Intelligence - 세션 핸드오버 (HANDOVER)

이 문서는 AI 인스턴스(Antigravity 등)가 교체되더라도 이전 작업의 핵심 맥락과 "동적 로깅", "수행 중인 과제"를 즉시 파악하여 작업을 재개할 수 있도록 설계되었습니다.

---

> [!IMPORTANT]
> **Key Resumption Phrase (재개 암호):** "이어서 계속하자" 
> (이 문구로 AI를 시작하면 다음의 진행 상황을 즉시 맥락에 반영합니다.)

---

## 🏗️ 시스템 아키텍처 요약 (Technical Context)
이전 인스턴스는 다음 아키텍처를 구축하고 검증했습니다.
- **Frontend**: `PluginLoader` (Dynamic Shadow DOM Inserter)
- **Backend Blueprint**: `/routes/plugins.py`, `/routes/widgets.py` (Blueprint Discovery)
- **Auth/Security**: `require_permission` 데코레이터 + `manifest.json` 기반의 Dynamic CSP
- **Scheduler Engine**: `briefing_scheduler.js` — 시간 기반 + 조건 감시(Condition Watch) 루틴 엔진
- **Routine Manager GUI**: `scheduler_manager.html` + `scheduler/editor.js` + `scheduler/index.js`

---

## 🎯 현재 수행 중인 활성 미션 (Active Task)

### **[M-1] Plugin-X 독립성 전객체 리팩토링 (COMPLETED)**
- `context` 프록시 고도화, 10개 플러그인 전역 호출 제거, 레거시 파일 삭제.

### **[M-2] UI 세부 고도화 및 데이터 정합성 (COMPLETED)**
- 사이드바-위젯 양방향 동기화, 서버 Persistence, Shadow DOM 격리.

### **[M-3] 스케줄러 고도화 v1.8 (COMPLETED — 이번 세션)**
- **성과**:
    - `/ns clean` 500 에러 수정 (라우터 응답 형식, rule_engine 파싱, 액션 적용 3중 수정).
    - YouTube Music 비표준 경로(`/yt/...`) → Plugin-X 표준(`/api/plugins/youtube-music/...`) 이관.
    - `terminal_notion.js` 제거 → `widget.js` 통합.
    - 스케줄러 범용 액션 추가: `terminal_command`, `api_call`.
    - **조건 감시 루틴(Condition Watch) 구현**: 시간이 아닌 데이터 조건으로 트리거.
    - **`exports` manifest 스펙** 도입: `sensors`, `commands` 선언 → GUI 자동 드롭다운.
    - **타입 안전 비교**: `condition.type` 기반 `number/string/boolean` 자동 변환.
    - **템플릿 변수**: TTS에서 `{{value}}`, `{{threshold}}` 사용 가능.
    - weather, stock, system-stats, notion manifest에 `exports` 추가.
    - Plugin-X Guide v1.8 업데이트 (exports 스펙, 조건 감시, HARD RULES).

### **[M-4] 테스트 및 안정화 (COMPLETED)**
- **성과**:
    - 조건 감시 루틴 통합 테스트 통과 (날씨 온도, KOSPI 등락률 하락 등).
    - stock API 응답 구조 개선(`raw_price`, `raw_change`) 및 manifest 필드 매핑 완벽 연동.
    - 루틴 매니저 GUI 저장-불러오기-타입 복원 정합성 확보.
    - 기존 시간 기반 루틴 회귀 테스트 정상 동작 확인.

### **[M-5] 공식 문서 고도화 및 최종 마무리 (COMPLETED)**
- **목표**: 
    - 향후 개발자와 AI를 위한 아키텍처 지원 가이드 문서 갱신.
    - README 파일 최신화 및 영문 가이드 병행 업데이트 완료.
    - MIGRATION_GUIDE.md 작성 및 배포 (단일 아키텍처에서 Plugin-X 모듈형으로의 Clean Install 가이드).
    - Custom Alias 무제한 매핑 기능 스튜디오 기능 신설 및 모든 매뉴얼(사용자/개발자/README) 추가 완료.

---

## 📂 이번 세션에서 수정된 핵심 파일

| 파일 | 변경 내용 |
|---|---|
| `static/js/briefing_scheduler.js` | `_checkConditionRoutine`, 타입 변환, 템플릿 변수 |
| `static/js/scheduler/editor.js` | 전면 재작성 — exports 로드, 조건 감시 UI |
| `static/js/scheduler/index.js` | `toggleTriggerType`, 조건 루틴 검증 |
| `templates/components/scheduler_manager.html` | Trigger Type 선택, 조건 감시 폼, 템플릿 힌트 |
| `plugins/scheduler/router.py` | `/exports` API (manifest 스캔) |
| `plugins/scheduler/i18n.json` | 범용 액션 한/영 설명 |
| `plugins/weather/manifest.json` | exports.sensors (기온, 습도) |
| `plugins/stock/manifest.json` | exports.sensors (KOSPI, 등락률) |
| `plugins/system-stats/manifest.json` | exports.sensors (CPU, 메모리) |
| `plugins/notion/manifest.json` | exports.commands (/ns, /memo) |
| `docs/Plugin-X_Guide.md` | v1.8 — exports 스펙, 조건 감시, 타입 시스템, Custom Alias 호출 가이드 추가 |
| `docs/manual/USER_GUIDE.md` | 사용자 친화적 가이드 대폭 개편 및 Custom Alias 무제한 사용법 명시 |
| `README.md` | 한/영 가이드라인 최상단 배치 및 Custom Alias 설명 추가 |
| `docs/MIGRATION_GUIDE.md` | 1.6 구버전 사용자를 위한 클린 인스톨 마이그레이션 안내 문서 생성 |
| `tools/clean_deploy.py` | 홈 서버 좀비 파일 원격 자동 삭제 후 클린 배포 스크립트 신설 |

---

## 💡 작업 재개 힌트 (Hints)
1.  **`[Watch]` 로그**: 콘솔에서 `[Watch]`로 필터링하면 조건 감시 루틴의 전체 흐름 추적 가능.
2.  **exports 캐싱**: `editor.js`의 `_cachedExports`는 세션 중 한 번만 로드됨. 새 플러그인 추가 후에는 새로고침 필요.
3.  **Jinja2 이스케이프**: `scheduler_manager.html`에서 `{{변수}}`는 `{% raw %}...{% endraw %}`로 감싸야 함.
4.  **타입 선언 필수**: `manifest.json`의 `exports.sensors[].type`이 정확해야 조건 비교가 올바르게 동작.

---
**세션 종료 일시: 2026-03-02 10:51 (v1.7.1)**
**담당자**: Antigravity AI (Master Instance)
