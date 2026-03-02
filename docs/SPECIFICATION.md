# AEGIS Intelligence - 통합 시스템 명세서 (SPECIFICATION)

**최종 업데이트: 2026-03-03 (v1.9 Standard)**
이 문서는 AEGIS 대시보드의 백엔드/프론트엔드 핵심 설계 원칙 및 시스템 사양을 정의합니다.

---

## 🏗️ 1. 핵심 아키텍처 설계 원칙 (Design Principles)

### 1.1 Strict Isolation (엄격한 격리)
- 위젯의 오류가 메인 시스템을 마비시키지 않도록 **Shadow DOM** 및 **JS Capability Proxy**를 사용합니다.
- 특정 위젯의 CSS 오버플로우나 스크립트 전역 변수 오염을 물리적으로 차단합니다.

### 1.2 Resource Proxy (리소스 대리)
- 플러그인은 파일 시스템이나 AI API Key에 직접 접근할 수 없습니다. 
- 모든 자원 사용은 시스템이 제공하는 안전한 **AegisContext(Capability Proxy)**를 통해서만 이루어집니다.

### 1.3 Universal Lifecycle
- 모든 모듈은 `init(shadowRoot, context)`, `destroy()` 표준 생명주기 규격을 준수하여 시스템이 리소스를 효율적으로 제어할 수 있게 합니다.

### 1.4 No JSON Editing (v1.8 원칙)
- 사용자에게 JSON 설정 파일의 직접 편집을 강요하지 않습니다.
- 모든 설정은 GUI를 통해 제공되며, 개발자는 `manifest.json`의 `exports`를 통해 자신의 데이터/명령어를 공개합니다.

---

## 🧩 2. Plugin-X 플랫폼 규격 (Expansion Platform)

### 2.1 동적 로딩 및 주입
- `static/js/plugin_loader.js`가 부팅 시 `/plugins` 폴더를 스캔하여 자산(HTML, CSS, JS)을 동적으로 주입합니다.
- **Auto-Stagger**: 위젯 배치 정보가 없을 경우, 시스템이 자동으로 겹치지 않게 계단식으로 배치합니다.

### 2.2 보안 및 권한 (Security & Permissions)
- **Dynamic CSP Engine**: `manifest.json`에 선언된 `csp_domains`를 분석하여 서버 부팅 시 `Content-Security-Policy` 화이트리스트에 즉시 반영합니다.
- **API Guard**: `require_permission` 데코레이션을 통해 선언되지 않은 API 호출을 차단합니다.

### 2.3 Exports — 데이터/명령어 공개 (v1.8)
- 플러그인은 `manifest.json`의 `exports` 필드를 통해 센서 데이터(`sensors[]`)와 명령어(`commands[]`)를 시스템에 공개합니다.
- **`/api/plugins/scheduler/exports`** API가 전체 플러그인의 exports를 수집하여 GUI에 제공합니다.
- `sensors[].type` 필드(`number`, `string`, `boolean`)에 따라 스케줄러가 자동 타입 변환을 수행합니다.

### 2.4 Environment Capability (v1.9)
- 플러그인은 `ENVIRONMENT_CONTROL` 권한을 요청하여 시스템의 전역 시각 효과를 제어할 수 있습니다.
- **`context.environment.applyEffect(type)`**: `RAINY`, `SNOWY`, `STORM`, `CLEAR` 등의 효과를 실시간으로 주입합니다.

### 2.5 UI Drag Lock & Resize Standard
- 모든 위젯은 `ui_drag_manager.js`에 의해 중앙 제어됩니다.
- **Lock State**: 잠금 상태에서는 마우스 드래그 및 크기 조절 핸들이 비활성화되어 사용자 실수에 의한 레이아웃 붕괴를 방지합니다.

---

## 🛠️ 3. 지능형 서비스 및 자동화 (Intelligence & Automation)

### 3.1 브리핑 스케줄러 (Briefing Scheduler)
- **Gatekeeper (수문장)**: 요일/시간별로 위젯의 알림 권한(`Allow/Deny`)을 중앙 통제합니다.
- **Routines (루틴)**: 지정된 시간에 `tactical_briefing`, `widget_briefing`, `speak` 등의 액션을 자동 실행합니다.
- **범용 액션 (v1.7.1)**: `terminal_command`(CommandRouter 명령), `api_call`(직접 API 호출)로 어떤 플러그인이든 스케줄 등록 가능.
- **조건 감시 (v1.8)**: 시간이 아닌 **데이터 조건**(센서 값 임계치)으로 트리거되는 루틴 지원. `condition.type` 기반 타입 안전 비교, `{{value}}`/`{{threshold}}` 템플릿 변수로 TTS 동적 텍스트 생성.

### 3.2 AI 분석 허브 (AI Hub)
- **Multi-Model Support**: Grok(xAI), Gemini(Google), Ollama(Local) 등 상황에 최적화된 모델을 선택하여 분석 및 브리핑을 수행합니다.
- **Tactical Briefing Center**: 타이틀 위젯을 통한 통합 상황 보고 및 전술 피드백 시스템을 제공합니다.

---

## 🌐 4. 외부 인터페이스 및 데이터 규격 (Data & API)

- **External AI API**: 외부 시스템이 아바타의 발화(`speak`)나 동작(`action`)을 원격 제어할 수 있는 표준 REST 규격을 제공합니다.
- **Persistence Master**: `config/settings.json`을 통해 모든 사용자 설정(언어, 위치, 줌 등)을 원자적으로 관리하고 동기화합니다.
- **Safe I18n**: 다국어 번역 엔진은 XSS 방지를 위해 기본적으로 `textContent`를 사용하며, 신뢰된 UI 요소에만 마크업을 허용합니다.

---
*상세 개발 방법론은 `docs/Plugin-X_Guide.md`를, 설정 방법은 `docs/manual/CONFIGURATION.md`를 참조하십시오.*
