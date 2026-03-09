# AEGIS Intelligence - 업데이트 로그 (UPDATE LOG)

## [v3.7.1] Command Routing Hardening & AI Precision (2026-03-08)

### 🚀 주요 변경 사항 (Core Updates)

1. **명령어 라우팅 보안 강화 (Strict Routing)**
   - `/` 접두사로 시작하는 확정적 명령어 모드에서 매칭 실패 시 AI로 자동 폴백되는 현상을 원천 차단했습니다.
   - 이제 `/` 모드는 100% 예측 가능한 동작만 수행하며, 실패 시 도움말을 안내하여 불필요한 AI 토큰 소모를 방지합니다.

2. **3단계 명령어 체계 (3-Tier System) 정립 및 도움말 현행화**
   - **Systematic (/)**: 100% 확정적 실행 (AI 미사용)
   - **Hybrid (/@)**: 플러그인 컨텍스트 + AI 지능 결합
   - **Pure AI (/# 또는 #)**: 순수 AI 지식 및 외부 검색 강제
   - 위 체계에 맞춰 시스템 통합 도움말(`get_unified_help_markdown`) 및 사용자 가이드를 전면 수정했습니다.

3. **AI 프롬프트 간섭 및 중복 응답 해결**
   - 특정 플러그인 컨텍스트(`restrict_to_plugin_id`) 호출 시, 타 플러그인의 액션 프롬프트가 혼입되지 않도록 필터링 로직을 강화했습니다.
   - 이를 통해 알람 설정 시 캘린더 안내가 섞여 나오는 등의 중복/혼선 응답 문제를 해결했습니다.

4. **플러그인 액션 가이드 표준화**
   - `calendar` 등 주요 플러그인의 액션 설명과 인자 힌트(`args`)를 명확하게 정돈했습니다.

---


## [v3.7.0] Deterministic Control & Centralized Routing (2026-03-08)

### 🚀 주요 변경 사항 (Core Updates)

1. **확정적 명령어 체계(Deterministic Actions) 도입**
   - AI의 의도 파악 단계를 거치지 않고, 명확한 키워드 매핑을 통해 즉각적인 기능을 수행하는 시스템을 구축했습니다.
   - 모든 플러그인(`alarm`, `todo`, `music`, `calendar` 등)에 대해 확정적 액션 핸들러를 구현하여 시스템 신뢰도를 극대화했습니다.
   - `/재생`, `/알람`, `/할일` 등 한글/영어/단축 명령어를 모두 지원합니다.

2. **BotManager 중앙 라우팅 및 자동 액션 로딩**
   - 모든 플랫폼(웹 터미널, 디스코드 등)의 메시지 처리를 `BotManager`로 일원화했습니다.
   - 시스템 시작 시 모든 활성 플러그인의 `manifest.json`을 스캔하여 확정적 액션을 자동으로 색인(Indexing)하고 등록하는 기능을 추가했습니다.
   - **명령어 우선순위 정립:** 시스템 코어 명령 > 확정적 액션 > AI 하이브리드(@) > 외부 검색(#) > AI 자연어 처리 순으로 처리됩니다.

3. **HUD 실시간 동기화 (`sync_cmd`) 메커니즘**
   - 백엔드에서 액션(예: 알람 추가, 노래 변경)이 수행된 후, 프론트엔드 대시보드 UI를 즉시 갱신하는 공용 이벤트 체계를 도입했습니다.
   - 폴링 대기 시간 없이 명령 수행과 동시에 UI가 업데이트되어 사용자 경험이 크게 개선되었습니다.

4. **플러그인 초기화 표준화 (`initialize_plugin`)**
   - 각 플러그인의 `router.py` 내에 `initialize_plugin()` 함수를 표준화하여, 액션 등록 및 컨텍스트 공급자 설정을 중앙에서 관리하도록 개선했습니다.

5. **시스템 아키텍처 및 개발 문서 전면 개정**
   - v3.7.0 표준 규격에 맞춰 `ROADMAP`, `ARCHITECTURE`, `FRAMEWORK_REFERENCE`, `Plugin-X_Guide`, `SPECIFICATION`, `AI_AGENT_PROMPT`를 모두 최신화했습니다.

---


## [v3.4.6] Dual Response & Voice Briefing Stability (2026-03-08)

### 🚀 주요 변경 사항 (Core Updates)

1. **듀얼 리스폰스([DISPLAY]/[VOICE]) 표준 수립**
   - AI 답변 형식을 시각적 상세 내용(`[DISPLAY]`)과 음성 요약(`[VOICE]`)으로 명확히 분리하는 지침을 시스템 전반에 적용했습니다.
   - `config/i18n/ko.json`에 `dual_response_instruction` 규격을 추가하여 모든 플랫폼(웹, 디스코드 등)에서 일관된 음성 브리핑 품질을 확보했습니다.

2. **BotManager AI 통신 로직 고도화**
   - 외부 채널(디스코드 등)을 통한 AI 질의 시에도 듀얼 리스폰스 규칙이 강제되도록 `services/bot_gateway.py`를 수정했습니다.
   - 마크다운 링크나 복잡한 기호가 포함된 텍스트가 TTS(음성)로 전달되어 발생하는 오작동을 근본적으로 차단했습니다.

3. **HUD 상호작용 및 UI 정렬 개선**
   - HUD 아바타의 말풍선(Chat)에 표시되는 사용자 입력값에서 시스템 내부 프롬프트를 제거하고 실제 질문 텍스트만 표시하도록 수정했습니다.
   - AI 응답 처리 시 불필요한 공백 및 제어 문자를 더욱 정밀하게 정제하여 시각적 직관성을 높였습니다.

---

## [v3.4.5] Universal Connectivity & Interaction (2026-03-07)

### 🚀 주요 변경 사항 (Core Updates)

1. **외부 라이브러리 자산 로컬화 (Local Assets)**
   - `Socket.IO` 및 `MarkedJS` 라이브러리를 CDN(`cdnjs`, `jsdelivr`) 의존성 없이 서버 내부에서 직접 서빙하도록 로컬 자산화했습니다.
   - 이를 통해 폐쇄망 환경이나 엄격한 보안 정책(CSP) 하에서도 시스템이 끊김 없이 작동합니다.

2. **지능형 네트워크 설정 도입 (`settings.json`)**
   - **ProxyFix 스위치:** 역방향 프록시(Nginx, Render 등) 뒤에서 구동될 때의 호환성을 `settings.json`의 `use_proxy` 설정으로 제어할 수 있습니다.
   - **커스텀 CSP 화이트리스트:** 사용자가 하드코딩 없이 `settings.json`의 `csp_allow_list`를 통해 허용 도메인을 동적으로 추가할 수 있는 유연한 보안 체계를 구축했습니다.

3. **시스템 아키텍처 안정화**
   - `app_factory.py`의 CSP 생성 로직을 모듈별 통합 방식으로 재설계하여 중복을 제거하고 린트 오류를 해결했습니다.
   - 윈도우 환경에서의 라이브러리 자동 다운로드 스크립트를 통한 배포 편의성을 확보했습니다.

4. **아바타 상호작용 기능 강화 (Hit Area Interaction)**
   - Live2D 모델의 특정 영역(머리, 몸 등) 클릭 시 반응하는 히트 영역 감지 로직을 추가했습니다.
   - 머리 클릭 시 'joy(기쁨)', 몸 클릭 시 'touch_body(인사/부끄러움)' 등 상황에 맞는 애니메이션이 트리거됩니다.
   - 개발자를 위해 현재 모델의 인터랙션 영역을 시각화할 수 있는 `window.toggleHitFrames()` 도구를 추가했습니다.

5. **개발 환경 보안 및 자산 관리 최적화**
   - 바이너리 파일(`.so`, `.pyd`) 내의 내부 경로가 보안 검사(`Privacy Guard`)를 방해하지 않도록 확장자 기반 예외 처리를 완료했습니다.
   - 개인화된 디버그 스크립트들을 `tools/` 폴더로 격리하여 Git 관리와 보안을 동시에 확보했습니다.

---

## [v3.4.2] Live2D Look-at & Advanced Interactions (2026-03-07)

### 🚀 주요 변경 사항 (Core Updates)

1. **Live2D 마우스 포인터 추명(Look-at) 기능 도입**
   - 아바타가 화면상의 마우스 커서를 자연스럽게 따라가도록 시선 처리 로직을 구현했습니다. (`static/js/ui_interaction_manager.js`)
   - `pixi-live2d-display`의 `focus(x, y)` API를 활용하여 부드러운 댐핑(Damping) 효과를 적용했습니다.
   - `core.js`에 `enableLookAtCursor` 전역 플래그를 추가하여 사용자 제어권을 확보했습니다.

2. **아바타 기반 스마트 상호작용(Smart Hub) 통합**
   - **더블 클릭 (Double-tap):** 퀘이크 HUD 스타일 터미널을 토글하고 입력창에 자동으로 포커스를 주는 단축 상호작용을 구현했습니다.
   - **롱 클릭 (Long-press, 800ms):** 아바타의 위치(Offset)와 확대 배율(Zoom)을 표준 상태로 부드럽게 복구하는 레이아웃 리셋 기능을 추가했습니다.
   - **트리플 클릭 (Triple-tap):** 기존 '아무말 대잔치(Markov)' 플러그인과 연동하여 비용 없는 랜덤 텍스트를 출력합니다.

3. **플러그인 호환성 및 명칭 불일치 해결**
   - 터미널 플러그인(v2.2.5+)의 `toggle()` 메서드와 코어 UI의 `setTerminalState()` 간의 호출 규격을 통합하여 더블 클릭 시 오작동하던 버그를 수정했습니다.
   - `markov` 플러그인의 `hidden: true` 설정을 통해 대시보드 위젯 목록을 정리하고 백그라운드 전용 동작으로 전환했습니다.

---

## [v3.4.0] Global I18n & Unified Command System (2026-03-07)

### 🚀 주요 변경 사항 (Core Updates)

1. **글로벌 다국어(I18n) 지원 체계 구축**
   - 백엔드(`BotManager`)의 하드코딩된 모든 프롬프트를 다국어 설정 파일(`config/i18n/`)로 분리했습니다.
   - `utils.get_i18n()` 함수를 도입하여 사용자의 언어 설정에 따라 AI 페르소나 및 시스템 지침이 동적으로 변경됩니다.
   - 한국어와 영어에 대해 완벽한 시스템 프롬프트 대응을 완료했습니다.

2. **통합 명령어 라우팅 시스템 (v3.3.x 통합)**
   - 웹 터미널, 디스코드 등 모든 플랫폼의 입력을 `BotManager`로 단일화했습니다.
   - **`/@` (Hybrid):** 로컬 데이터 + 외부 검색을 결합한 지능형 응답.
   - **`/` (Local):** 외부 검색 차단, 오직 시스템 데이터로만 구성된 정밀 보고.
   - **`/#` (Search):** 시스템 컨텍스트 없이 순수 외부 실시간 검색 수행.

3. **디스코드 봇 어댑터(Discord Adapter) 아키텍처 도입**
   - 플랫폼 독립적인 `BotAdapter` 클래스를 기반으로 디스코드 연동 모듈을 구현했습니다.
   - 향후 텔레그램 등 타 플랫폼 확장이 용이한 '약한 결합(Loose Coupling)' 구조를 채택했습니다.

4. **알람 플러그인(Alarm) 정밀 동기화 및 버그 수정**
   - 알람 목록 API(`/api/plugins/alarm/list`)의 응답 규격을 표준화하여 대시보드 위젯과의 연동 오류를 해결했습니다.
   - AI가 생성한 알람 설정 액션(`[ACTION] SET_ALARM`)을 `BotManager`가 정확히 수행하도록 핸들러를 보강했습니다.

## [v3.1.0] Studio Preview & Active Hardening (2026-03-05)

### 🚀 주요 변경 사항 (Core Updates)

1. **스튜디오 맛보기용(Preview Mode) 도입**
   - 스폰서 전용이었던 Live2D 스튜디오를 모든 사용자에게 개방(Preview)했습니다.
   - **UI 차별화:** 비스폰서 접속 시 "맛보기용" 파란색 배지를 표시하고, `idle`, `dance` 동작만 활성화(Bright Highlight)하여 기능을 강조했습니다.
   - **제한적 사용:** 프리미엄 감정/동작은 잠금(Gray/Locked) 처리하고, `alias.json` 수기 수정을 차단(`readonly`)하여 후원을 유도하는 구조를 확립했습니다.

2. **보안 로직 바이너리화 및 검증 강화**
   - 핵심 스폰서 체크 로직을 `core_security.py`로 완전히 분리하고, 해시 알고리즘에 **Identity(사용자 식별값)**를 포함하여 위조 방지 수준을 높였습니다.
   - 로컬(`secrets.json`) 및 서버의 스폰서 키를 새로운 보안 규격(`...-E2BAB342`)으로 일제 업데이트했습니다.
   - `build_security_win.bat`을 통해 윈도우 환경에서도 1-Click 컴파일이 가능하도록 고도화했습니다.

3. **Git 저장소 자산 최적화 (Cleanup)**
   - Git에서 관리될 필요가 없는 임시 파일(`tmp...`), 백업 파일(`.bak`), 오디오 캐시(`*.mp3`, `*.txt`)를 추적 목록에서 제거하고 물리적으로 삭제하여 저장소를 경량화했습니다.
   - 바이너리(`.pyd`, `.so`)만 추적하고 소스(`.py`, `.c`)는 숨기는 화이트리스트 기반 보안 정책을 현행화했습니다.

## [v3.0.0 Alpha] Core Hardening & Binary Shield (2026-03-05)

### 🚀 주요 변경 사항 (Core Updates)

1. **바이너리 실드(Binary Shield) 도입 (Sponsorship Protection)**
   - 핵심 보안 로직인 `is_sponsor`와 솔트(Salt) 값을 `core_security.py`로 분리했습니다.
   - Cython을 활용하여 해당 모듈을 기계어(.pyd / .so)로 컴파일함으로써 소스 코드 공개 시에도 핵심 자산을 안전하게 보호합니다.
   - 윈도우(MSVC) 및 리눅스(GCC) 환경 모두에서 자동 빌드 및 검증할 수 있는 파이프라인(`setup_security.py`, `remote_build_linux.py`)을 구축했습니다.

2. **통합 시큐어 런처(`run_aegis.bat`) 및 자동화 도구 개발**
   - **run_aegis.bat:** 로컬 실행 시 보안 바이너리 존재 여부를 체크하고, 필요 시 즉석에서 컴파일을 유도하는 통합 런처를 도입했습니다.
   - **deploy.py (Hardening 통합):** 서버 배포 시 리눅스용 바이너리를 자동 빌드한 뒤, 생성된 `.so` 파일을 로컬로 자동 회수(Download)하고 서버 소스를 삭제하는 'Zero-Source' 배포 방식을 구현했습니다.
   - **.gitignore Hardening:** 실수로라도 핵심 소스(`.py`, `.c`)가 Git에 노출되지 않도록 차단하고, 컴파일된 바이너리(`.pyd`, `.so`)만 추적하도록 규칙을 강화했습니다.

3. **보안 계획 고도화 및 최악의 시나리오 분석**
   - 위젯 간의 격리를 강화하기 위한 'Zero-Trust UI' 및 'Import Level Security' 전략을 수립했습니다.
   - `core_security_hardening_plan.md`를 통해 향후 API 키 보호 및 시스템 권한 제어 로드맵을 확정했습니다.

## [v2.9.5] Funny Plugin & System Stability (2026-03-05)

### 🚀 주요 변경 사항 (Core Updates)

1. **(비용 0원) '아무말 대잔치(Markov)' 플러그인 신규 개발**
   - 아바타와 가볍게 교감할 수 있는 로컬 마르코프 체인(Markov Chain) 기반의 텍스트 생성 플러그인을 추가했습니다.
   - **Zero-Cost:** AI API 호출 없이 브라우저단에서 무작위 문장을 생성하여 토큰 비용을 완전히 절감합니다.
   - **Interactive Poke:** 아바타(Live2D 캔버스)를 마우스로 3번 연속 클릭(Poke)할 때 트리거되는 물리적 상호작용을 구현했습니다.
   - 2024-2025 최신 밈, 개그콘서트 레전드 대사, 개발자 유머를 포함한 100여 개의 고밀도 코퍼스를 주입하여 생성 퀄리티를 확보했습니다.

3. **로그인 리다이렉션(`next`) 및 시스템 안정성 보강**
   - 로그인 성공 후 이전 페이지로 돌아가지 않던 버그를 `next` 파라미터 처리로 해결했습니다.
   - 서버 인메모리 캐시(`init_pack`)와 브라우저 AXC(IndexedDB) 간의 해시 불일치로 인한 로딩 지연을 방지하기 위해 서버 재시작 프로세스를 최적화했습니다.

---

## [v2.9.0] Architecture Documentation & Developer Platform (2026-03-05)

### 🚀 주요 변경 사항 (Core Updates)

1. **시스템 아키텍처 공식 문서 수립 (`ARCHITECTURE.md`)**
   * 시스템 전반의 High-Level Architecture 다이어그램(Mermaid)을 포함한 종합 레퍼런스를 신규 작성했습니다.
   * 컴포넌트 상호작용 시퀀스(초기화, AI 질의 처리)를 Mermaid로 시각화하고, 8대 설계 준수 사항을 공식 문서화했습니다.

2. **Gemini API 400 에러 원천 해결**
   * 구조화된 JSON 출력(`response_schema`) 요청 시 `tools=[]`를 강제 주입하여, Search 속성 충돌로 인한 400 에러를 근본적으로 차단했습니다. (`services/gemini_service.py`)

3. **TTS `speechText` 파라미터 규격화**
   * `ai_gateway.js`에서 TTS 호출 시 `speechText`(마크다운 제거된 순수 텍스트) 전달 로직을 수정하고, `tts.js` 엔진의 오디오 재생 파라미터를 표준화했습니다.
   * `/help` 명령어의 `--mute` 옵션 가이드 연동을 완료했습니다.

4. **개발자 문서 체계 전면 재구조화 (3분류)**
   * `docs/` 하위를 역할별로 정리: 시스템 문서(`docs/`), 개발자 문서(`for_developer/`), 사용자 매뉴얼(`manual/`).
   * 기존 문서 11개(Plugin-X_Guide, FRAMEWORK_REFERENCE, 감사 보고서 등)를 `archive/`로 이동하여 탐색 비용을 최소화했습니다.

5. **`PLUGIN_SPEC.md` 통합본 신설 (Single Source of Truth)**
   * 기존 `Plugin-X_Guide.md`와 `FRAMEWORK_REFERENCE.md`의 **70% 이상 중복**을 해소하고, 모든 규칙/API/스키마를 단일 문서(~900줄)로 통합했습니다.

6. **`QUICK_START.md` 5분 퀵스타트 가이드 신설**
   * `create_plugin.py` 사용법 → 파일 설명 → TODO 수정 → 확인까지, 최소 5분 안에 첫 플러그인을 완성하는 온보딩 가이드를 추가했습니다.

7. **`create_plugin.py` 보일러플레이트 생성기 추가**
   * `--id`, `--name`, `--permissions`, `--csp-domains`, `--hidden`, `--no-backend` 옵션을 지원하는 플러그인 골격 자동 생성 스크립트(~665줄)를 신규 작성했습니다.
   * 생성 함수: `create_manifest()`, `create_router()`, `create_service()`, `create_widget_html()`, `create_widget_js()`, `create_widget_css()`, `create_config()`.

8. **영문 개발자 문서 3종 추가**
   * `QUICK_START_en.md`, `PLUGIN_SPEC_en.md`, `AI_AGENT_PROMPT_en.md`를 신규 작성하여 글로벌 개발자 접근성을 확보했습니다.

9. **프론트/백엔드 정합성 전수 점검**
   * 함수 호출 파라미터 및 응답 스키마의 프론트엔드-백엔드 간 일관성을 전수 검증하고, 불일치 항목을 수정했습니다.

---

## [v2.4.5] AXC (AEGIS Extreme Cache) & 0ms 광속 부팅 통합 (2026-03-04)

### 🚀 주요 변경 사항 (Core Updates)

1. **AXC (AEGIS Extreme Cache) 시스템 도입**
   * 브라우저 영구 저장소(**IndexedDB**)를 활용하여 모든 플러그인 소스(HTML/JS/CSS)를 로컬에 강박적으로 캐싱합니다.
   * 서버 시작 시 모든 플러그인 데이터를 SHA256 해시로 식별하며, 클라이언트와 해시가 일치할 경우 **네트워크 다운로드 없이 10ms 미만**으로 즉시 로딩(Instant Boot)합니다.

2. **Parallel Hybrid Loading (v2.4.0) 병렬화**
   * 기존의 순차적 플러그인 로딩 방식을 `Promise.all` 기반의 병렬 방식으로 대수술했습니다.
   * DOM 구조 생성 순서는 유지하면서, 각 플러그인의 로직 실행(Hydration)은 동시에 처리되어 로딩 병목을 완전히 제거했습니다.

3. **Avatar Loading HUD (v2.3.5) 도입**
   * 무거운 Live2D 모델이 완전히 나타나기 전까지 "AVATAR UNIT LOADING..." 전용 스캐닝 HUD를 표시합니다.
   * 페이지 파싱 즉시 HUD가 기동되도록 초기화 타이밍을 최적화하여 사용자 체감 대기 시간을 제로화했습니다.

4. **정밀 성능 지표(Metrics) 세분화**
   * `Network Check` / `Asset Preparation` / `Logic Execution`으로 성능 로그를 분리했습니다.
   * 이제 개발자는 캐시가 제대로 작동하는지(`AssetPrep < 20ms`), 어느 위젯이 로직 실행 병목을 일으키는지 정확히 추적할 수 있습니다.

5. **백엔드 JSON Pre-serialization 최적화**
   * 요청마다 반복되던 플러그인 데이터 직렬화 작업을 서버 시작 시 1회 수행하여 캐싱(Memory caching)합니다.
   * 서버 응답 대기 시간(TTFB)을 최소화했습니다.

---

## [v2.2.1] 터미널 명령어 라우팅 원천 해결 및 알리아스 동기화 (2026-03-04)

### 🚀 주요 변경 사항 (Core Updates)

1. **백엔드-프론트엔드 알리아스 동기화 시스템 (Auto-Discovery)**
   * 백엔드 `register_context_provider`에서 등록된 `aliases`('뉴스', '날씨' 등)를 프론트엔드 `CommandRouter`가 시작 시 자동으로 긁어와 동기화합니다.
   * 이제 프론트엔드 코드에 한글 알리아스를 하드코딩할 필요가 없으며, 백엔드 수정만으로 터미널 별칭이 추가됩니다.

2. **명령어 라우팅 미스매치 전수 수정 (Canonical Routing)**
   * `/뉴스` 입력 시 `/news`로 변환되더라도 위젯이 수신 대기하지 않아 AI로 빠지던 버그를 해결했습니다.
   * 모든 위젯(`news`, `weather`, `stock`, `finance`, `notion`, `climate-control`, `yt-music` 등)이 자신의 **ID와 일치하는 정규 명령어(Canonical Command)**를 수신하도록 전수 보강했습니다.

3. **프롬프트 탈-하드코딩 (De-hardcoding)**
   * `gemini_service.py` 내의 "AEGIS", "Response:" 등의 하드코딩된 페르소나와 레이블을 제거하고 `prompts.json` 로딩 방식으로 전환했습니다.
   * `{{current_time}}`, `{{modules}}` 등 동적 컨텍스트 치환 기능을 강화했습니다.

4. **AI 응답 정제 강화 (High-Pass Filtering)**
   * 모든 AI 출력 필드(`display`, `briefing`, `voice`)에 `strip_markdown_wrappers`를 일괄 적용하여 마크다운 노이즈를 완벽히 제거했습니다.
   * `ai_filter.json`의 규칙에 따른 데이터 익명화 및 정제 프로세스를 내재화했습니다.

---

## [v2.2.0] 터미널 인텐트 및 HUD 알리아스 시스템 확립 (2026-03-03)

### 🚀 주요 변경 사항 (Core Updates)
1. **터미널 인텐트 파싱 아키텍처 도입**
   * 터미널 질의의 첫 글자(Prefix)에 따른 **의도(Intent) 기반 강제 라우팅**을 구현했습니다.
   * `# (검색)`: 시스템의 추론 과정을 100% 바이패스하고 구글 검색 등 외부 도구를 강제로 호출합니다.
   * `@ (컨텍스트 지정)`: 원하는 위젯 플러그인(`register_context_provider()`를 통한 알리아스 등록)의 데이터를 AI 프롬프트에 직접 주입합니다.

2. **다중 알리아스 (Multiple Aliases) 지원 및 벡터 DB 로드맵 폐기**
   * 기존 플러그인은 ID로만 식별되었으나, 이제 `aliases=['스케줄러', '일정']` 형태의 유동적인 한글 동의어 식별 기능을 제공합니다.
   * 이에 따라 심각한 데이터 파편화를 야기할 수 있던 Vector DB 중심 아키텍처(search_memory) 로드맵을 선회하여, 실시간 Zero-Shot Context 조립 아키텍처를 공식 표준으로 채택했습니다.

3. **터미널 오버레이 HUD (Shift + ~)**
   * 단축키가 기존 `Shift + /`에서 `Shift + ~` (Quake 방식 HUD)로 완전 변경되었습니다.
   * 이에 발맞춰 `/help` 커맨드가 이 동적 알리아스와 구조를 모두 표시하도록 고도화(Backend API 추가)되었습니다.

4. **TTS 음소거 옵션 (`--m`, `--mute`) 내재화**
   * 터미널 질의문에 `--m` 또는 `--mute` 가 포함될 경우 프론트엔드 라우터가 자율적으로 파싱하여 `tts.js` 호출부(음성 출력)를 건너뛰도록 처리했습니다. (응답 패스 및 UI 로그 기능은 정상 동작)

---

## [v2.1.0] AI 응답 표준화 및 시스템 안정화 (2026-03-03)

### 🚀 주요 변경 사항 (Core Updates)

1.  **AI 응답 필드 표준화 (Standardization)**
    *   시스템 전반의 AI 응답 규격을 `display`와 `briefing`으로 통일했습니다.
    *   `display`: 터미널 및 로그 출력용 (리치 텍스트/마크다운 포함 가능).
    *   `briefing`: 음성(TTS) 및 말풍선 출력용 (순수 텍스트 필터링 적용).
    *   데이터 불일치로 인한 TTS 오출력 및 파싱 에러를 원천 차단했습니다.

2.  **중앙 집중식 마크다운 정제 (Parsing High-Refinement)**
    *   `utils.py`에 `strip_markdown_wrappers` 유틸리티 도입.
    *   AI가 응답을 ```json ... ``` 형식으로 감싸더라도 백엔드에서 즉시 정제하여 파싱 성공률을 극대화했습니다.
    *   프론트엔드 `tts.js`에서 음성 출력 직전 2차 필터링(`stripMarkdown`)을 통해 음성에 노이즈가 섞이지 않도록 조치했습니다.

3.  **멀티 엔진 커맨드 라우팅 (AI Hub v2.0)**
    *   `CommandRouter`를 고도화하여 Gemini뿐만 아니라 Ollama, ChatGPT 등 외부 엔진에서도 시스템 명령어(`navigate`, `toggle` 등)를 분석할 수 있도록 확장했습니다.
    *   플러그인별 고유 명령어 프롬프트를 외부 엔진 질의 시에 자동으로 주입합니다.

4.  **전역 TTS 및 HUD 통합 서비스**
    *   각 위젯이 개별적으로 처리하던 음성 재생 로직을 전역 `window.speakTTS` 및 `context.speak()`로 통합했습니다.
    *   이를 통해 음성 재생과 말풍선 동기화, 비주얼라이저 연동이 모든 플러그인에서 일관되게 동작합니다.

### 🛠️ 버그 수정 (Bug Fixes)

*   [Fixed] 브리핑 데이터 수신 시 `text` 필드가 없어 발생하는 오류 수정.
*   [Fixed] 터미널 명령어 입력 시 `ai_gateway.js` 404 에러로 인한 마비 현상 해결.
*   [Fixed] 음성 출력 시 마크다운 기호가 그대로 읽히던 노이즈 현상 제거.
*   [Fixed] 특정 플러그인 라우터에서 `gemini_service` 참조 시 발생하는 순환 참조 및 임포트 에러 해결.

---

## [v2.0.0] Plugin-X 전면 도입 및 Shadow DOM 격리 (2026-03-02)

*   터미널 및 서치 윈도우 등 코어 위젯의 완벽한 플러그인화.
*   Shadow DOM을 통한 스타일/스크립트 충돌 방지.
