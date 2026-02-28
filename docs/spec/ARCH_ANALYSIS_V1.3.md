# 🏗️ AEGIS v1.3 시스템 구조 분석 및 글로벌화(i18n) 준비 가이드

**작성일**: 2026-02-28
**대상 버전**: v1.3 (Briefing Scheduler & Boot Optimization 완료 상태)
**목적**: 글로벌 지원(English Support) 도입 전 현재 시스템의 하드코딩된 언어 의존성을 분석하고, 효율적인 확장 구조를 설계함.

---

## 1. 📂 전체 아키텍처 요약 (System Overview)

AEGIS는 **Python(Flask) 기반의 백엔드**와 **Vanilla JS 기반의 프론트엔드**가 결합된 구조입니다. 모든 데이터는 JSON API를 통해 통신하며, 설정은 `config/` 하위의 JSON 파일들로 관리됩니다.

### 백엔드 (Python/Flask)
- **Routes (`routes/`)**: 기능별 엔드포인트 분리 (widgets, config, studio, notion 등).
- **Services (`services/`)**: 비즈니스 로직 캡슐화. AI 브리핑, 금융, 날씨, 음성 서비스 등이 포함됨.
- **Config**: 시스템 전반의 설정과 비밀키 관리.

### 프론트엔드 (JS/CSS)
- **Core (`core.js`)**: 부팅 최적화 및 엔진 초기화 담당.
- **Managers**: 위젯 매니저(`widgets.js`), 스케줄러(`briefing_scheduler.js`), 애니메이션 매니저 등.
- **Widgets (`static/js/widgets/`)**: 개별 위젯의 독립적 데이터 수집 및 렌더링 로직.
- **Studio (`static/js/studio/`)**: Live2D 자산 최적화 및 관리 도구.

---

## 2. 🌐 글로벌화(i18n) 영향 범위 분석

다국어 지원(한국어/영어)을 위해 수정이 필요한 핵심 영역들을 식별했습니다.

### 2.1 UI 라벨 및 하드코딩 문자열
가장 먼저 처리해야 할 부분으로, HTML과 JS에 흩어져 있는 텍스트들을 JSON 언어팩으로 분리해야 합니다.
- **`index.html`**: 사이드바 메뉴명, 위젯 헤더 이름, 섹션 제목.
- **`ui.js`**: 토스트 메시지, 알림창 팝업 텍스트, 설정창 레이블.
- **`widgets.js`**: 위젯 기본 상태 메시지(예: "데이터 로딩 중...", "데이터가 없습니다").
- **`studio/` 내 JS**: 에일리어스 매니저 메시지, 시뮬레이터 조작부 이름.

### 2.2 AI 프롬프트 및 브리핑 엔진
- **`services/ai_service.py` & `gemini_service.py`**: 현재 프롬프트가 한국어 기반으로 작성되어 있음. 사용자의 언어 설정에 따라 시스템 프롬프트를 영어/한국어로 가변 적용해야 함.
- **`services/briefing_manager.py`**: 뉴스 요약 및 브리핑 문장 생성 시 "오늘의 전술 보고입니다" 등의 고정 문구 분리 필요.

### 2.3 음성 및 음질 (TTS)
- **`services/voice_service.py`**: 한국어 전용 엔진(ko-KR)에서 영어 엔진(en-US) 및 목소리 선택 가능하도록 확장 필수.
- **`config/scheduler.json`**: 루틴 내 `speak` 액션에 정의된 한글 대사들을 다국어화하거나 언어별로 분기 처리 필요.

### 2.4 데이터 포맷팅 및 소스 (Localization)
- **날짜/시간**: 주말 표시(월~일 vs Mon~Sun), 12/24시간제 선택 옵션.
- **금융 (`stock_service.py`)**: 통화 기호 (₩ vs $), 지수 이름 (코스피 vs S&P500) 및 관련 뉴스 소스.
- **날씨**: 온도 단위(Celsius vs Fahrenheit).

---

## 3. 🛠️ 구현 전략 제안 (Implementation Roadmap)

글로벌 지원을 위해 제안하는 **3단계 전략**입니다.

### 1단계: 언어팩 시스템 구축 (Foundation)
- `config/i18n/` 폴더 내에 `ko.json`, `en.json` 언어 파일을 생성합니다.
- 프론트엔드에서 `window.i18n` 객체를 통해 실시간으로 텍스트를 치환하는 글로벌 함수(`_t('key')`)를 도입합니다.

### 2단계: AI 프롬프트 가변화 (Intelligence)
- 백엔드 `system.json`에 `lang` 필드를 추가합니다.
- AI 엔진 호출 시 `lang` 설정을 payload에 포함하여, 응답 언어를 LLM이 직접 결정하도록 프롬프트를 조정합니다.

### 3단계: 로컬라이징 위젯 강화 (Localization)
- 개별 위젯(Stock, Weather)의 API 요청 시 `lang` 파라미터를 지원하도록 수정합니다.
- RSS 뉴스 소스를 언어 설정에 따라 한국어 뉴스/영어 뉴스로 스위칭하는 필터를 추가합니다.

---

## 4. 📝 향후 작업 시 주의사항 (Checkpoint)

- **컨텍스트 유지**: 작업 중 `base.css`의 폰트 설정을 언어에 따라 가변적으로 적용해야 합니다 (한글 전용 폰트 vs 영어 최적화 폰트).
- **UI 깨짐 주의**: 영어의 경우 한국어보다 문장 길이가 길어지는 경우가 많으므로, 플렉스 박스나 위젯 가로 폭 설정을 유연하게 가져가야 합니다.
- **하향 호환성**: 언어팩을 적용하더라도 기존 한국어 사용자에게는 영향이 없도록 기본값을 `ko`로 설정해야 합니다.

---

> [!IMPORTANT]
> 본 분석 문서는 AEGIS v1.4 글로벌 지원 작업을 위한 **Blue Print**입니다. 이후의 모든 코딩 작업은 이 가이드라인에 정의된 명칭과 구조를 따릅니다.
