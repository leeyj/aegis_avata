# AEGIS Intelligence - 통합 시스템 명세서 (SPECIFICATION)

**최종 업데이트: 2026-03-07 (v3.4.0 Global Standard)**
이 문서는 AEGIS 대시보드의 백엔드/프론트엔드 핵심 설계 원칙 및 시스템 사양을 정의합니다.

---

## 🏗️ 1. 핵심 아키텍처 설계 원칙 (Design Principles)

### 1.1 Strict Isolation (엄격한 격리)
- 위젯의 오류가 메인 시스템을 마비시키지 않도록 **Shadow DOM** 및 **JS Capability Proxy**를 사용합니다.
- 특정 위젯의 CSS 오버플로우나 스크립트 전역 변수 오염을 물리적으로 차단합니다.
- **Interaction Isolation**: 위젯 내부의 클릭 이벤트가 컨테이너의 드래그 이벤트로 전파되지 않도록 `Propagation Stop` 정책 및 `Interactive Class` 화이트리스트(.no-drag, .interactive 등)를 강제합니다.

### 1.2 Resource Proxy (리소스 대리)
- 플러그인은 파일 시스템이나 AI API Key에 직접 접근할 수 없습니다. 
- 모든 자원 사용은 시스템이 제공하는 안전한 **AegisContext(Capability Proxy)**를 통해서만 이루어집니다.

### 1.3 Universal Lifecycle
- 모든 모듈은 `init(shadowRoot, context)`, `destroy()` 표준 생명주기 규격을 준수하여 시스템이 리소스를 효율적으로 제어할 수 있게 합니다.

### 1.4 No JSON Editing (v1.8 원칙)
- 사용자에게 JSON 설정 파일의 직접 편집을 강요하지 않습니다.
- 모든 설정은 GUI를 통해 제공되며, 개발자는 `manifest.json`의 `exports`를 통해 자신의 데이터/명령어를 공개합니다.

### 1.5 표준 유틸리티 및 레지스트리 (v1.9)
- **utils.py 강제**: 플러그인은 개별적인 I/O 대신 시스템이 보장하는 `load_json_config`, `save_json_config` 유틸리티를 사용해야 합니다.
- **Context Registry**: `register_context_provider`를 통해 플러그인의 상태 데이터를 브리핑 엔진에 주입하는 표준 인터페이스를 준수해야 합니다. (Signature: `callable -> str/dict`)

### 1.6 Pure Isolation (절대 격리 원칙)
- A 플러그인에서 B 플러그인의 파이썬 모듈(`xxx_service.py` 등)을 직접 `import` 하는 것은 **어떤 상황에서도 절대 허용되지 않습니다.**
- 플러그인 간 종속성 및 통신은 반드시 시스템이 제공하는 간접 API(예: `manifest.json` 내 `exports`와 `context.askAI`)를 통해 런타임에서 풀어야 합니다.

### 1.7 AI Response & Command Standardization (v3.4.0)
- **Universal Routing**: 모든 메시징 인터페이스는 `BotManager`를 통해 입력을 통합 처리합니다. 
- **Unified Command Symbols**:
    - **`/@` (Hybrid)**: 로컬 컨텍스트와 외부 검색을 결합한 AI 답변.
    - **`/` (Local)**: 외부 검색을 차단하고 오직 로컬 위젯 데이터만 요약 보고.
    - **`/#` (Search)**: 컨텍스트 없이 순수 외부 실시간 검색 수행.
- **I18n System Prompts**: 시스템 페르소나와 지침을 하드코딩하지 않고 본체의 언어 설정(`lang`)에 따라 `config/i18n/`에서 동적으로 로드합니다.

### 1.8 Terminal Alias Auto-Sync (v2.2-v3.3)
- 플러그인이 `register_context_provider`에 `aliases=['뉴스', '날씨']` 파라미터를 등록하면, 백엔드 API(`/api/plugins/aliases`)를 통해 프론트엔드 `CommandRouter`가 시작 시 자동으로 동기화합니다.
- **Canonical Routing**: 터미널에서 `/뉴스` 입력 시 `/news`로 변환되며, `BotManager`가 이를 해석하여 해당 플러그인의 데이터를 수집합니다.
- **De-hardcoding**: 모든 별칭은 백엔드에서 단일 관리하며, 한글/영어 등 다국어 별칭 대응을 지원합니다.

### 1.9 Selective Briefing & Scalability (v2.3 원칙)
- **User Intent over Visibility**: 브리핑 시 단순히 눈에 보이는 위젯이 아니라, 사용자가 명시적으로 선택한 위젯의 데이터를 우선 수집합니다.
- **Data Filtering**: `DataService.collect_all_context(plugin_ids)`를 통해 필요한 데이터만 선별 수집하여 AI 토큰 비용을 최소화하고 분석 품질을 높입니다.
- **Config Persistence**: 플러그인은 자신의 설정을 저장할 수 있는 표준 REST 인터페이스를 가져야 하며, 시스템은 이를 `config.json`에 영구 보관합니다.

### 1.10 AXC (AEGIS Extreme Cache) & Instant Boot (v2.4.5 원칙)
- **Asset Bundling**: 서버는 모든 플러그인 자산(HTML/JS/CSS)을 단일 JSON 팩(`init_pack`)으로 사전 직렬화하여 네트워크 오버헤드를 최소화합니다.
- **Local Caching (AXC)**: 브라우저 **IndexedDB**를 영구 저장소로 활용하며, 서버의 SHA256 해시와 로컬 캐시 해시가 일치할 경우 원격 다운로드 없이 즉시 로드(Instant Boot)합니다.
- **Parallel Hydration**: 20개 이상의 플러그인을 `Promise.all` 기반으로 병렬 실행하여, 전체 로딩 시간을 "가장 느린 플러그인 1개" 수준으로 단축합니다.
- **Visual Continuity**: 아바타 모델 로딩 전용 HUD 운영을 통해 무거운 리소스 로딩 중에도 사용자에게 시스템 상태를 명확히 전달합니다.

### 1.11 Architecture-First (v2.9.0 원칙) ✨NEW
- **아키텍처 우선 원칙**: 코드 수정 전 반드시 `docs/ARCHITECTURE.md`를 먼저 읽어 시스템 설계 철학(Plugin-X, Schema-Driven, Event-Driven)을 숙지해야 합니다.
- **일관성 보장**: 아키텍처 레퍼런스에 명시된 데이터 흐름과 모듈 경계를 준수하지 않는 수정은 리저트됩니다.

### 1.12 Developer Platform (v2.9.0 원칙) ✨NEW
- **Boilerplate Generator**: `python create_plugin.py --id {id} --name "{name}"` 명령으로 규격 준수 플러그인 골격을 자동 생성합니다.
- **Single Source of Truth**: 모든 규칙/API/스키마는 `docs/for_developer/PLUGIN_SPEC.md` 단일 문서에서 정의되며, 중복 정의를 금지합니다.
- **Quick Onboarding**: `docs/for_developer/QUICK_START.md`를 통해 5분 내 첫 플러그인을 완성할 수 있는 온보딩 경로를 제공합니다.

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

### 3.2 AI 분석 허브 (AI Hub v2.1)
- **Multi-Model Support**: Grok(xAI), Gemini(Google), Ollama(Local) 등 상황에 최적화된 모델을 선택하여 분석 및 브리핑을 수행합니다.
- **Aggressive Text Cleaning**: `utils.clean_ai_text()`를 통해 AI 응답에서 불필요한 라벨을 제거합니다.

### 3.3 Messaging Brain & Adapters (v3.4.0) ✨NEW
- **BotManager Hub**: 디스코드, 웹 터미널 등의 입력을 처리하는 중앙 인지 엔진입니다.
- **Weak Coupling Adapters**: `BotAdapter` 상속을 통해 코어 수정 없이 새로운 채널(메신저 봇 등)을 즉시 확장할 수 있습니다.
- **Action Synchronization**: AI 응답 내 `[ACTION]` 태그(예: 알람 설정, 시스템 제어)를 통합 감지하여 등록된 플러그인 핸들러를 실행합니다.

---

## 🌐 4. 외부 인터페이스 및 데이터 규격 (Data & API)

- **External AI API**: 외부 시스템이 아바타의 발화(`speak`)나 동작(`action`)을 원격 제어할 수 있는 표준 REST 규격을 제공합니다.
- **Persistence Master**: `config/settings.json`을 통해 모든 사용자 설정(언어, 위치, 줌 등)을 원자적으로 관리하고 동기화합니다.
- **Safe I18n**: 다국어 번역 엔진은 XSS 방지를 위해 기본적으로 `textContent`를 사용하며, 신뢰된 UI 요소에만 마크업을 허용합니다.

---
*상세 개발 방법론은 `docs/for_developer/Plugin-X_Guide.md`를, 설정 방법은 `docs/manual/CONFIGURATION.md`를 참조하십시오.*
