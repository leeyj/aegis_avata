# AEGIS Plugin-X: 확장 모듈 개발 가이드 (v3.4.0)

---

## ⚡ 0. 성능 아키텍처: AXC (AEGIS Extreme Cache)
v2.4.5부터 도입된 **AXC**는 플러그인의 부팅 속도를 극대화합니다.
- **IndexedDB**: 모든 플러그인 자산(HTML/JS/CSS)은 브라우저 IndexedDB에 영구 저장됩니다.
- **SHA256 Versioning**: 서버의 해시 값과 일치할 경우 네트워크 다운로드 없이 **10ms 미만**으로 즉시 로드됩니다.
- **Two-Step Hydration**: DOM 구조를 먼저 생성한 뒤 자산을 병렬로 주입하여, 로딩 속도와 레이어 정합성을 동시에 확보합니다.

---

## 📌 0. Plugin-X 핵심 정책 (반드시 읽을 것)

### 0-1. 아키텍처 방향성: 완전 독립 모듈화

Plugin-X의 목표는 **각 플러그인이 메인 시스템과 물리적으로 분리된 독립 모듈**로 동작하는 것입니다. 플러그인은 핵심 코어(`app_factory.py`, `templates/index.html`, `static/js/` 등)를 수정하지 않고, 폴더를 추가하거나 삭제하는 것만으로 기능을 확장하거나 제거할 수 있어야 합니다.

### 0-2. 절대 금지 사항 (⛔ HARD RULES)

| # | 정책 | 위반 시 발생하는 문제 |
|---|---|---|
| 1 | 플러그인의 로직을 **`/static/js/widgets/`** 또는 **`/services/`** 에 작성하지 마라 | 메인 시스템에 의존성이 발생하여 모듈 제거 시 코어가 깨짐 |
| 2 | 서비스 파일명을 **`service.py`** (일반명)로 만들지 마라 | 파이썬 네임스페이스 충돌로 다른 플러그인이 오동작 |
| 3 | 라우트 경로에 **`/api/plugins/[id]/`** 접두사 없이 단축 경로를 사용하지 마라 | 보안 시스템(`plugin_security_service`)이 플러그인을 식별하지 못해 권한 체크 우회 |
| 4 | `router.py`에서 **`import service`** 등 절대 경로 임포트를 사용하지 마라 | 글로벌 모듈 캐시 오염으로 엉뚱한 서비스가 로드됨 |
| 5 | 전역 객체(`window.XxxHandler`)를 **`index.html`의 `<script>` 태그**로 로드하지 마라 | Plugin-X 격리 원칙 위반. 모든 로직은 `widget.js` 내에서 완결되어야 함 |
| 6 | `widget.js`의 `init()` 외부에서 **Flask `request`/`session` 등 컨텍스트 의존 객체**를 참조하지 마라 | 앱 시작 시 블루프린트 탐색 과정에서 `RuntimeError: Working outside of request context` 발생 |

### 0-3. 권장 사항 (✅ SOFT RULES)

- 플러그인 간 통신은 반드시 **`context` API** (Capability Proxy)를 경유한다.
- 전역 변수(`window.xxx`)를 사용해야 할 경우, `widget.js`의 `init()` 내부에서만 등록하고 `destroy()`에서 해제한다.
- **[v2.3]** 버튼, 체크박스 등 클릭 가능한 요소에는 반드시 `e.stopPropagation()`을 적용하고, 컨테이너가 클릭 가능할 경우 `.no-drag`, `.interactive`, `.clickable` 중 하나를 클래스에 포함하여 위젯 드래그(Move) 이벤트와의 간섭을 차단한다.
- `config.json`은 플러그인 내부에서만 참조하며, 다른 플러그인의 설정 파일을 직접 읽지 않는다.
- 터미널 명령어 핸들러는 `context.registerCommand()`로 등록하며, 별도의 외부 JS 파일을 만들지 않는다.
- **[v2.4.5] AXC 무결성**: 위젯의 자산은 해시로 관리되므로, 개발 중에 수동으로 자산을 수정했다면 반드시 서버를 재시작하거나 브라우저 캐시를 삭제하여 해시 갱신을 트리거해야 한다.

---

## 🏗️ 1. 플러그인 표준 구조

모든 플러그인은 `/plugins` 디렉토리 하위에 고유한 폴더명을 가지며, 시스템 코드를 수정하지 않고 폴더 추가만으로 기능을 확장할 수 있습니다.

```text
/plugins/[plugin-id]/
├── __init__.py               # 파이썬 패키지 선언 (필수, 빈 파일)
├── manifest.json             # 플러그인 메타데이터, 권한, CSP 선언 (필수)
├── config.json               # 플러그인 전용 로컬 설정 (선택)
├── router.py                 # Flask Blueprint (백엔드, 선택)
├── {plugin_id}_service.py    # 비즈니스 로직 (선택, 명명 규칙 필수)
└── assets/                   # 프론트엔드 자산 폴더
    ├── widget.html           # HTML 조각 (Shadow DOM 주입용)
    ├── widget.js             # 로직 실행 모듈 (Init/Destroy + 명령어 핸들러)
    └── widget.css            # 스타일 시트 (Shadow DOM 격리)
```

> ⚠️ **`__init__.py`가 없으면 상대 경로 임포트(`from .xxx_service import ...`)가 동작하지 않습니다.**

---

## 📜 2. manifest.json 작성 규격 (v1.7)

`manifest.json`은 플러그인의 정체성, **보안 권한(CSP)**, 백엔드 진입점을 정의하는 가장 중요한 파일입니다.

### 필수 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 플러그인 고유 ID (폴더명과 동일해야 함) |
| `name` | string | 사용자에게 표시되는 플러그인 이름 |
| `version` | string | 시맨틱 버전 |
| `entry.html` | string | 위젯 HTML 파일 경로 |
| `entry.js` | string | 위젯 JS 모듈 경로 |

### 선택 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `entry.css` | string | 위젯 CSS 파일 경로 |
| `entry.backend` | string | 백엔드 라우터 파일명 (예: `"router.py"`) |
| `permissions` | string[] | 시스템 권한 목록 (`api.ai_agent`, `api.voice_service` 등) |
| `csp_domains` | object | CSP 외부 도메인 목록 (`script-src`, `frame-src`, `img-src`, `connect-src`) |
| `layout.default_size` | string | 기본 위젯 크기 (`size-1`, `size-1-5`, `size-2`) |
| `hidden` | boolean | `true`면 UI 패널 없이 백엔드만 로드 |
| `exports` | object | 스케줄러/외부 연동을 위한 공개 데이터 포인트 선언 |
| `exports.sensors` | array | 조건 감시 가능한 데이터 목록 |
| `exports.commands` | array | 사용 가능한 터미널 명령어 목록 |

### 전체 예시 (IoT 위젯 — exports 포함)

```json
{
    "id": "home-assist",
    "name": "홈 어시스트 온도계",
    "version": "1.0.0",
    "entry": {
        "html": "assets/widget.html",
        "js": "assets/widget.js",
        "backend": "router.py"
    },
    "exports": {
        "sensors": [
            {
                "id": "indoor_temp",
                "name": "실내 온도",
                "unit": "°C",
                "type": "number",
                "endpoint": "/api/plugins/home-assist/temperature",
                "field": "temp"
            },
            {
                "id": "humidity",
                "name": "실내 습도",
                "unit": "%",
                "type": "number",
                "endpoint": "/api/plugins/home-assist/humidity",
                "field": "humidity"
            }
        ],
        "commands": [
            { "prefix": "/ha", "name": "홈 어시스트 제어", "examples": ["/ha status", "/ha fan on"] }
        ]
    }
}
```

### 튜토리얼 예시: mp3-player 플러그인 설정

어떤 파일을 불러와야 할지, 시스템 권한을 어떻게 요구할지 고민하는 개발자를 위한 실전 `manifest.json` 예시입니다. 로컬 파일을 다루거나 AI 엔진과 통신하는 민감한 작업은 반드시 `permissions` 배열에 권한을 명시해야 합니다.

```json
{
    "id": "mp3-player",
    "name": "로컬 미디어 허브",
    "version": "1.0.0",
    "author": "AEGIS Core",
    "entry": {
        "html": "assets/widget.html",
        "js": "assets/widget.js",
        "css": "assets/widget.css",
        "backend": "router.py"
    },
    "permissions": [
        "api.media_proxy",
        "api.ai_gateway"
    ],
    "layout": {
        "default_size": "size-1-5"
    }
}
```

**예제 해석:**
1. **`entry` 필드:** 
   플러그인이 시작될 때 `widget.html`의 뼈대를 가져오고, 기능 구현을 위해 `widget.js`와 뷰를 위한 `widget.css`를 불러옵니다. 서버에서는 `router.py`를 찾아 별도의 `/api/plugins/mp3-player/...` 라우트를 등록합니다.
2. **`permissions` 필드:** 
   * `"api.media_proxy"`: `mp3-player`는 시스템 내부의 파일 시스템 등에서 MP3 파일을 읽어와야 하므로, 보안 프록시를 통과할 수 있는 권한을 요구합니다.
   * `"api.ai_gateway"`: 재생 중인 음악을 기반으로 AI가 감상을 브리핑하는 등 AI 엔진과 통신해야 할 경우 이 권한이 필요합니다.
   이 권한들을 명시하지 않고 파이썬 라우터(`router.py`)에서 권한이 필요한 API를 호출하려고 하면 데코레이터(`@require_permission`)에 의해 즉시 차단(HTTP 403 Forbidden)됩니다.
3. **`layout` 필드:** 
   사이드바에서 아이콘을 눌러 바탕화면에 꺼냈을 때, 기본적으로 그리드에서 `size-1-5` (1.5칸) 너비를 차지하도록 초깃값을 줍니다.
4. **실제 데이터(MP3) 파일의 위치 및 제공 방식:**
   * 플러그인은 완벽한 분리를 지향하므로 위젯 폴더(`plugins/mp3-player/`) 내부에 무거운 미디어 파일을 직접 넣지 않습니다. 
   * **외부 볼륨 마운트:** 사용자가 자신이 가지고 있는 거대한 미디어 폴더를 시스템에 복사하지 않게 하려면, `config.json`을 통해 절대 경로를 외부 주입받는 방식을 권장합니다.
   * **`plugins/mp3-player/config.json` 파일 생성:**
     ```json
     { "media_directory": "D:\\MyMusic" }
     ```
   * **백엔드 라우터 처리:** `router.py` 에서는 `media_directory` 값이 설정되어 있으면 해당 절대 경로를 읽고, 없으면 기본 내장 폴더(`static/media/mp3/`)로 폴백하도록 구현해야 합니다. (`utils`의 `load_json_config` 활용)

### `exports.sensors[]` 필드 규격

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | ✅ | 센서 고유 ID (플러그인 내에서 유일) |
| `name` | string | ✅ | 사용자에게 표시되는 이름 (예: "실내 온도") |
| `unit` | string | ✅ | 단위 표시 (예: "°C", "%", "원") |
| `type` | string | ✅ | 데이터 타입: `number`, `string`, `boolean` |
| `endpoint` | string | ✅ | 데이터 조회 API 경로 (`/api/plugins/...` 표준) |
| `field` | string | ✅ | API 응답 JSON에서 값을 추출할 키 |

### `exports.commands[]` 필드 규격

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `prefix` | string | ✅ | 명령어 접두사 (예: `/ha`) |
| `name` | string | ✅ | 명령어 설명 |
| `examples` | string[] | ❌ | 사용 예시 목록 |

> ⛔ **`exports`를 선언하지 않으면 해당 플러그인의 데이터는 루틴 매니저 조건 감시에 나타나지 않습니다.** 다른 사용자가 활용할 수 있도록 반드시 선언하십시오.

> 💡 **설계 원칙: 사용자는 절대 JSON을 직접 편집하지 않습니다.** `exports`에 선언된 정보는 루틴 매니저 GUI가 자동으로 드롭다운과 폼으로 변환합니다. 개발자가 `manifest.json`에 몇 줄 추가하면, 비개발자 사용자는 드롭다운에서 선택만 하면 됩니다.

---

## ⚖️ 2-2. 특수 레이아웃: Fixed HUD (v2.2)

특정 플러그인(예: 터미널, 전체 화면 오버레이)은 일반 위젯처럼 드래그하거나 위치를 비율로 재계산해서는 안 됩니다. 이를 위해 `manifest.json`에 `layout.fixed` 속성을 지원합니다.

### 설정 방법
```json
"layout": {
    "fixed": true,
    "zIndex": 10000
}
```

### 주요 특징 및 규격 (⛔ 반드시 준수)
1. **위치 고정**: `fixed: true` 설정 시, 해당 플러그인은 전역 `applyUIPositions` (창 크기 조절에 따른 위치 재계산) 대상에서 **자동으로 제외**됩니다. 항상 화면 구석(0, 0)을 유지합니다.
2. **스타일 격리**: 부모 컨테이너(`fixed-plugin-wrapper`)는 전역 유리 효과(Glass/Blur)를 갖지 않습니다. 플러그인 내부(`widget.css`)에서만 스타일을 제어하여 시스템 레이아웃과의 간섭을 최소화합니다.
3. **이벤트 투과**: 고정형 플러그인의 래퍼는 기본적으로 `pointer-events: none`입니다. 인터랙션이 필요한 내부 요소(입력창, 버튼)에만 `pointer-events: auto`를 개별적으로 부여해야 합니다.

---

## 🧩 3. 프론트엔드: 런타임 환경 (Capability Proxy)

플러그인이 로드되면 `init(shadowRoot, context)` 함수가 호출됩니다. **`context` 객체를 통해서만** 시스템 자원에 접근합니다.

### Context API 목록

| API | 설명 |
|---|---|
| `context.log(msg)` | 콘솔 로그 (플러그인 태그 자동 부여) |
| `context._t(key)` | i18n 번역 |
| `context.applyI18n()` | Shadow DOM 내부 재번역 |
| `context.askAI(task, data)` | AI Gateway 요청 (표준 display/briefing 응답 반환) |
| `context.speak(display, briefing, visualType)` | 통합 TTS 발화 (단, 쿼리에 `--m` 플래그 발생시 `window.speakTTS` 생략 기믹 적용됨) |
| `context.appendLog(tag, message)` | 터미널 로그 출력 |
| `context.registerCommand(prefix, callback)` | 터미널 명령어 등록 |
| `context.registerTtsIcon(type, icon)` | TTS 아이콘 등록 |
| `context.triggerReaction(type, data, timeout)` | 아바타 리액션 트리거 |
| `context.triggerBriefing(feedbackEl, options)` | **[v2.3]** 전략 브리핑 실행. (Proactive-Agent에서 설정된 필터를 자동으로 적용) |
| `context.registerSchedule(name, type, callback)` | 글로벌 틱 스케줄러 등록 |
| `context.playMotion(filename)` | Live2D 모션 재생 (실제 파일경로 또는 Alias 지원) |
| `context.changeModel(modelName)` | Live2D 모델 전환 |
| `context.getMediaList()` | 미디어 프록시 목록 |
| `context.getAudioUrl(filename)` | 미디어 스트리밍 URL |
| `context.environment.applyEffect(type)` | 전역 환경 시각효과 트리거 (RAINY, SNOWY, STORM, CLEAR) |

### 💡 Custom Alias (커스텀 알리아스)를 활용한 확장
AEGIS는 `idle`, `joy` 등 기본 지정된 모션 이름뿐만 아니라, **사용자나 개발자가 정의한 무제한의 커스텀 알리아스**를 지원합니다.
* 사용자는 스튜디오 UI에서 `superhappy`, `grey_face` 처럼 자유롭게 이름을 생성하여 모션을 매핑할 수 있습니다.
* 개발자는 `widget.js` 내부에서 아래와 같이 **사용자가 지정한 커스텀 알리아스**를 그대로 호출할 수 있습니다. 메인 코드를 수정할 필요가 없습니다.
  ```javascript
  // 'superhappy'라는 사용자가 만든 알리아스가 있다면, 즉시 아바타가 해당 모션을 수행
  context.triggerReaction('MOTION', { alias: 'superhappy' });
  ```

### widget.js 표준 골격

```javascript
export default {
    updateTimer: null,
    config: {},

    init: async function (shadowRoot, context) {
        context.log("Widget Initializing...");

        // 1. 설정 로드
        try {
            const res = await fetch('/api/plugins/[plugin-id]/config');
            const data = await res.json();
            Object.assign(this.config, data);
        } catch (e) { }

        // 2. 데이터 로드 & 렌더링
        const refresh = async () => { /* ... */ };
        await refresh();

        // 3. 글로벌 노출 (필요 시, init 내부에서만)
        window.refreshMyWidget = refresh;

        // 4. 정규 명령어 등록 (터미널 알리아스 연동 필수)
        // [IMPORTANT] 백엔드 aliases (예: 뉴스) 작동을 위해
        // 자신의 manifest.id와 일치하는 정규 커맨드를 반드시 등록해야 함.
        context.registerCommand('/[plugin-id]', (cmd) => this.refresh());
        context.registerCommand('/mycmd', (cmd) => this.handleMyCommand(cmd));

        // 5. 주기적 갱신
        this.updateTimer = setInterval(refresh, this.config.polling_interval_ms || 300000);
    },

    // 명령어 핸들러는 반드시 같은 객체 내에 정의
    async handleMyCommand(command) {
        // ...
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
    }
};
```

> ⚠️ **명령어 핸들러(`handleXxx`)는 반드시 이 export 객체 내부에 정의해야 합니다.** 별도의 `terminal_xxx.js` 파일을 만들어 `index.html`에서 로드하는 것은 정책 위반입니다.

### 3-6. 위젯 라이프사이클 (Widget Lifecycle) 및 DOM 제한사항
시스템은 위젯을 격리된 상태로 마운트하고 파괴합니다. 이 타이밍과 제한사항을 반드시 숙지하십시오.

1. **주입 (Injection)**: 시스템이 `assets/widget.html`을 Fetch한 뒤, `shadowRoot.innerHTML`을 통해 삽입합니다.
   - ⛔ **경고**: `innerHTML` 로 주입되므로 **`widget.html` 내부에 `<script>` 태그를 작성해도 브라우저는 이를 실행하지 않습니다.** 모든 로직은 반드시 `widget.js`에 작성하십시오.
   - ⛔ **경고**: 플러그인은 `<slot>` API를 사용할 수 없으며, 모든 DOM 조작은 `shadowRoot.querySelector()`로 국한해야 합니다.
2. **초기화 (Init)**: HTML 주입 후, `widget.js`의 `init(shadowRoot, context)`가 단 1회 호출됩니다. 여기서 데이터 Fetch 및 `setInterval`을 시작해야 합니다.
3. **파괴 (Destroy)**: 사용자가 대시보드에서 위젯을 닫거나 새로고침할 때 `destroy()`가 호출됩니다. 여기서 폴링 타이머나 이벤트 리스너를 정리하지 않으면 **메모리 누수(Memory Leak)**가 발생합니다.

---

## ⚡ 3.5. 부팅 최적화: AXC & Parallel Hydration (v2.4.5) ✨NEW

시스템은 20개 이상의 플러그인을 순식간에 띄우기 위해 다음과 같은 최적화 파이프라인을 가집니다.

1. **Synchronous Wrapper Creation**: 순서(Priority) 보장을 위해 모든 플러그인의 래퍼를 DOM에 먼저 생성합니다.
2. **Parallel Hydration**: 자산 로드 및 `init()` 실행은 `Promise.all` 기반으로 동시에 수행됩니다.
3. **Blob URL Isolation**: 번들링된 JS는 `URL.createObjectURL(blob)`을 통해 인메모리에서 즉시 실행되므로 네트워크 레이턴시가 0입니다.

---

## 🛠️ 4. 백엔드: 라우터 및 서비스 표준 (v1.7)

### 4-1. 파일 명명 규칙 (⛔ 위반 금지)

```text
✅ 올바른 예시                    ❌ 잘못된 예시
─────────────────────────────    ─────────────────────────
notion_service.py               service.py
weather_service.py              weather.py (모호)
stock_service.py                data_fetcher.py (비표준)
```

**규칙: `{plugin_id에서 하이픈을 언더스코어로 변환}_service.py`**
- `youtube-music` → `ytmusic_service.py`
- `system-stats` → `system_service.py`
- `proactive-agent` → (services/ 공유 서비스 사용으로 예외)

### 4-2. 라우트 경로 규칙 (⛔ 위반 금지)

모든 백엔드 API 엔드포인트는 다음 패턴을 따라야 합니다:

```
/api/plugins/{plugin-id}/{action}
```

| ✅ 올바른 예시 | ❌ 잘못된 예시 | 위반 사유 |
|---|---|---|
| `/api/plugins/youtube-music/playlists` | `/yt/playlists` | 비표준 접두사, 보안 파서 우회 |
| `/api/plugins/notion/add` | `/api/notion/add` | `plugins` 세그먼트 누락 |
| `/api/plugins/weather/data` | `/weather` | 완전히 비표준 |

> 💡 **이유**: `plugin_security_service.py`의 `get_plugin_id_from_request()`가 URL의 3번째 세그먼트(`/api/plugins/[여기]`)에서 플러그인 ID를 추출합니다. 이 패턴을 벗어나면 **보안 권한 체크가 작동하지 않습니다.**

### 4-3. 임포트 규격 및 유틸리티 (⛔ 위반 금지)

플러그인은 시스템의 안정성을 위해 직접적인 `json.load` 대신 반드시 상위의 `utils.py` 모듈을 사용해야 합니다.

```python
# ✅ 올바른 임포트
from .notion_service import NotionService  # 상대 경로
from utils import load_json_config, save_json_config  # 시스템 유틸리티
from services.plugin_registry import register_context_provider # 브리핑 엔진 등록
```

#### 🛠️ 표준 유틸리티 API (`utils.py`)
| 함수명 | 파라미터 | 반환값 | 특징 |
|---|---|---|---|
| `load_json_config(path)` | `path` (str) | `dict` | 파일 부재 시 `{}` 반환, `utf-8-sig` 인코딩 자동 처리 |
| `save_json_config(path, data, merge=True)` | `path`, `data`, `merge` | `bool` | 원자적 저장(Atomic Write) 수행. `merge=True` 시 기존 데이터 보존 |
| `clean_ai_text(text)` | `text` (str) | `str` | AI 응답의 ```json 등 마크다운 래퍼 및 불필요한 태그 제거 |

### 4-4. router.py 표준 골격

```python
import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from .{plugin_id}_service import MyService    # 상대 경로 임포트
from utils import load_json_config
from services import require_permission
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

my_plugin_bp = Blueprint("{plugin_id}_plugin", __name__)

# 0. Context Provider 등록 (브리핑 엔진 연동)
# 규격: register_context_provider(plugin_id: str, provider_func: callable)
# provider_func는 인자 없이 호출되며 str 또는 dict를 반환해야 함
def get_my_context():
    return MyService.get_data()

register_context_provider("{plugin-id}", get_my_context)

# 1. 설정 조회
@my_plugin_bp.route("/api/plugins/{plugin-id}/config")
@login_required
def get_config():
    return jsonify(load_json_config(CONFIG_PATH))

# 2. 데이터 조회
@my_plugin_bp.route("/api/plugins/{plugin-id}/data")
@login_required
@require_permission("api.{permission}")
def get_data():
    return jsonify(MyService.get_data())

### 4-5. Context Provider 및 다중 알리아스 엔진 (v2.7+) ✨NEW

register_context_provider('my-plugin', get_my_plugin_context, aliases=['일정', '스케줄'])
```

**동작 효과 (알리아스 자동 동기화):**
1. **백엔드**: `aliases`에 등록된 한글 별칭들은 앱 시작 시 프론트엔드 `CommandRouter`로 자동 동기화됩니다.
2. **사용자**: 터미널에서 `/일정` (또는 Slash 없이 `일정`)을 입력합니다.
3. **라우팅**: 시스템이 `/일정` ➡️ `/my-plugin`으로 변환합니다.
4. **실행**: `widget.js`에서 `registerCommand('/my-plugin', ...)`으로 등록된 핸들러가 즉시 실행됩니다.

> ⚠️ **주의**: 백엔드에서 `aliases`를 등록하더라도, 프론트엔드 `widget.js`에서 **플러그인 ID와 동일한 이름의 명령어(`/my-plugin`)를 등록**하지 않으면 해당 알리아스는 핸들러를 찾지 못하고 AI 질의로 스킵됩니다.

---

## 🤖 5. AI 응답 표준화 및 프롬프트 정책 (v3.0) ✨NEW

시스템의 일관성 있는 페르소나와 깨끗한 응답을 위해 다음 프롬프트 정책을 준수해야 합니다.

### 5-1. 프롬프트 탈-하드코딩 (De-hardcoding)
AI 에이전트의 이름("AEGIS")이나 응답 레이블("Response:") 등을 프롬프트 내부에 하드코딩하지 마십시오. 모든 지시사항은 `prompts.json`을 통해 로드되며, 시스템이 동적으로 주입하는 컨텍스트를 활용해야 합니다.

- **사용 가능 변수**: `{{current_time}}`, `{{modules}}` (현재 로드된 플러그인 목록)

### 5-2. 응답 정제 규격
AI가 마크다운 래퍼(```json) 등을 포함하여 응답하더라도 시스템은 `utils.clean_ai_text()`를 통해 이를 자동으로 제거합니다. 개발자는 정제된 순수 데이터를 사용하게 되며, 특히 TTS용 `briefing` 필드에는 절대로 마크다운 기호가 포함되지 않도록 프롬프트에서 지시해야 합니다.

로더가 여러 플러그인을 동적으로 메모리에 적재하므로, 파일 이름 스페이스 충돌과 모듈 꼬임이 가장 고질적인 에러 원인입니다.

1. **플러그인 간 간섭 금지**: A 플러그인에서 B 플러그인의 파이썬 파일을 `import` 하는 것은 **절대 금지**됩니다. 모든 통신은 프론트엔드 `fetch()`나 `context`를 통해 이루어져야 합니다.
2. **명시적 상대 경로 사용**: 백엔드 스크립트 분리 시, 절대 경로 `import`를 피하십시오.
   - ❌ 잘못된 예: `import my_service` (다른 플러그인에 동명의 파일이 있으면 충돌 발생)
   - ✅ 올바른 예: `from . import my_service` 또는 `from .my_service import MyService`
3. **전역 변수 오염 주의**: 모듈 최상단에 선언된 전역 변수(e.g., `_config = None`)는 위젯이 여러 개 켜져도 싱글턴으로 하나만 존재합니다. 요청(Request) 단위를 덮어쓰지 않도록 주의하십시오.

---

## 🛡️ 5. 보안 및 디자인 가이드

### 5-1. CSS 격리 (Shadow DOM Boundary)
- 플러그인의 스타일은 Shadow DOM 내부에 캡슐화되어 외부 페이지를 오염시키지 않습니다.
- 시스템 표준 CSS 변수(`--neon`, `--glass`, `--bg-dark`)를 사용하여 전체 디자인 톤을 유지하십시오.

### 5-2. CSP (Content Security Policy) 및 도메인 포맷
- 외부 리소스를 불러올 때 `manifest.json`의 `csp_domains`에 반드시 도메인을 등록해야 합니다. **미등록 시 Frontend fetch가 브라우저에 의해 즉시 차단(Block)됩니다.**
- **도메인 포맷 규칙**:
  - Scheme(프로토콜)을 반드시 포함하는 것을 권장합니다: `["https://api.github.com", "https://*.example.com"]`
  - 이미지 렌더링을 위해 `data:` 나 `blob:` 형태의 Base64 파일 스킴이 필요하다면 요소 렌더링 방식을 재고하거나 보안 규칙을 우회해선 안 됩니다. (AEGIS는 CSP `data:` 허용을 매우 보수적으로 다룸)

### 5-3. 리소스 해제 (Memory Leak 방지)
- `destroy()` 함수에서 `setInterval`, `setTimeout`, 이벤트 리스너를 반드시 해제하십시오.
- 해제하지 않으면 위젯이 제거된 이후에도 백그라운드에서 리소스를 소모합니다.

### 5-4. 에러 핸들링
- `fetch()` 호출은 반드시 `try/catch`로 감싸고, 사용자에게 적절한 에러 메시지를 표시하십시오.
- 백엔드 라우트 함수도 `try/except`로 감싸고, 에러 시 `{"success": false, "message": "..."}` 형식으로 반환하십시오.

### 5-5. 백엔드 서비스 연결 수명 관리 (Connection Lifecycle)
- `*_service.py` 클래스에서 IMAP, WebSocket 등 **장기 연결을 싱글턴으로 유지**할 경우, 반드시 연결 생존 확인(keepalive) 로직을 포함해야 합니다.
- 패턴: 작업 전 `NOOP` 또는 `ping`으로 연결 생존 확인 → 실패 시 `_conn = None`으로 초기화 후 재연결. (→ `FRAMEWORK_REFERENCE §3-6` 참조)

### 5-6. 이메일 프로토콜 용어 정정 (SMTP vs IMAP)
- **이메일 수신 및 읽기**: `IMAP` (`imaplib.IMAP4_SSL`) — 가장 보편적인 방식
- **이메일 발송**: `SMTP` (`smtplib.SMTP_SSL`) — 요청마다 연결 후 즉시 해제
- **"SMTP로 이메일을 받는다"는 표현은 기술적으로 틀렸습니다.** 수신은 IMAP/POP3입니다.
- 현대 Gmail/Outlook은 일반 비밀번호 IMAP을 차단합니다. **앱 비밀번호(Google App Password)** 또는 **OAuth2 액세스 토큰**을 `config.json`에 저장하여 사용하십시오.

---

## 🛠️ 6. 설정 관리 인터페이스 (Config Management) ✨NEW

플러그인이 자체적인 저장 공간(`config.json`)을 가질 경우, 프론트엔드 UI에서 이를 수정할 수 있도록 다음 표준 엔드포인트를 구현할 것을 권장합니다.

```python
@plugin_bp.route("/api/plugins/{id}/config", methods=["GET", "POST"])
@login_required
@standardized_plugin_response
def handle_config():
    if request.method == "POST":
        data = request.json
        current_config = load_json_config(CONFIG_PATH)
        current_config.update(data)
        save_json_config(CONFIG_PATH, current_config)
        return jsonify({"status": "success", "config": current_config})
    return jsonify(load_json_config(CONFIG_PATH))
```

---

## 💅 7. 프리미엄 디자인 가이드 (Aesthetics) ✨NEW

AEGIS의 위젯은 단순한 정보 전달을 넘어 시각적으로 "와우(WOW)"한 경험을 주어야 합니다.
1. **Typography**: 기본 폰트 대신 `Google Fonts (Inter, Outfit, Roboto)`를 사용하십시오.
2. **Glassmorphism**: `backdrop-filter: blur(12px)`와 반투명 배경을 조합하여 깊이감을 부여하십시오.
3. **Micro-animations**: 버튼 호버나 상태 변경 시 부드러운 `transition`과 `pulse` 효과를 적극 활용하십시오.
4. **Color Palette**: 단순한 원색(Red, Blue) 대신 조화로운 HSL 컬러나 시스템 네온 컬러(`--neon-blue`)를 사용하십시오.

---

## 📐 6. Loader 동작 원리 (참고)

`routes/plugins.py`의 `discover_plugin_blueprints()` 함수가 앱 시작 시 자동으로 동작합니다:

1. `/plugins/` 하위 모든 폴더를 스캔
2. `manifest.json`의 `entry.backend` 필드 확인
3. `importlib.util.spec_from_file_location`으로 모듈 격리 로드
4. 로드된 모듈 내에서 `Blueprint` 객체를 `isinstance` 체크로 탐색
5. 발견된 Blueprint를 Flask 앱에 자동 등록

> ⚠️ **4번 과정에서 `isinstance` 체크를 `hasattr('name')` 보다 먼저 수행합니다.** 이는 Flask의 `request`, `session` 등 LocalProxy 객체가 요청 컨텍스트 없이 속성에 접근될 때 `RuntimeError`를 발생시키는 것을 방지하기 위함입니다. 이 동작을 변경하지 마십시오.

---

## ⏰ 7. 스케줄러 연동: 범용 루틴 등록 (v1.7.1)

스케줄러(`plugins/scheduler`)는 시간 기반 자동 실행을 담당합니다. 플러그인은 스케줄러 코드를 직접 수정하지 않고, **`config.json`에 루틴을 추가하는 것만으로** 자신의 기능을 예약할 수 있습니다.

### 7-1. 지원 액션 타입 전체 목록

| 액션 | 설명 | 필수 필드 |
|---|---|---|
| `tactical_briefing` | 전체 요약 브리핑 (Title 패널 클릭) | - |
| `widget_briefing` | 특정 위젯 브리핑 | `target` (widget id) |
| `speak` | TTS 음성 출력 | `text` |
| `reload` | 페이지 새로고침 | - |
| `yt_play` | YouTube 재생 | `target` (playlist id, 선택) |
| `yt_stop` | YouTube 정지 | - |
| `yt_volume` | YouTube 볼륨 조절 (페이드) | `volume` (0-100) |
| `wallpaper_set` | 배경화면 변경 | `target` (파일명) |
| **`terminal_command`** | ⭐ 범용: 터미널 명령어 실행 | `command` |
| **`api_call`** | ⭐ 범용: 백엔드 API 직접 호출 | `url`, `method`(선택), `body`(선택) |

### 7-2. `terminal_command` — 플러그인 명령어 예약 실행

`CommandRouter`에 등록된 **어떤 명령어든** 스케줄에 등록할 수 있습니다.  
스케줄러는 지정된 시간에 `CommandRouter.route(command)`를 호출합니다.

```json
{
    "id": "notion_daily_cleanup",
    "name": "매일 저녁 노션 정리 검토",
    "time": "22:00",
    "days": [1, 2, 3, 4, 5],
    "action": "terminal_command",
    "command": "/ns clean",
    "enabled": true
}
```

**활용 예시:**

| 사용 사례 | command 값 |
|---|---|
| 노션 정리 검토 | `/ns clean` |
| 노션 메모 자동 추가 | `/memo 오늘의 회의 정리 필요` |
| 노션 검색 | `/ns switch @업무` |
| AI 질의 | `오늘 날씨 브리핑해줘` |

> 💡 **원리**: `widget.js`에서 `context.registerCommand()`로 등록한 명령어는 자동으로 `CommandRouter`에 등록됩니다. 따라서 플러그인이 명령어를 등록하기만 하면, 별도 작업 없이 스케줄러에서 해당 명령어를 예약할 수 있습니다.

### 7-3. `api_call` — 백엔드 API 직접 호출

터미널 UI를 거치지 않고 **백엔드 API를 직접 호출**해야 하는 경우에 사용합니다.

```json
{
    "id": "notion_auto_apply_rules",
    "name": "주말 노션 자동 정리 실행",
    "time": "03:00",
    "days": [0, 6],
    "action": "api_call",
    "url": "/api/plugins/notion/rules/evaluate",
    "method": "GET",
    "speak_result": true,
    "enabled": false
}
```

**필드 설명:**

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `url` | string | ✅ | API 엔드포인트 (반드시 `/api/plugins/...` 표준 경로) |
| `method` | string | ❌ | HTTP 메소드 (기본값: `"GET"`) |
| `body` | object | ❌ | POST 요청 시 전송할 JSON 본문 |
| `speak_result` | boolean | ❌ | `true`이면 응답의 `message` 필드를 TTS로 음성 출력 |

### 7-4. 새 플러그인에서 스케줄러 액션을 지원하는 방법

**스케줄러 코드를 수정할 필요가 없습니다.** 다음 중 하나만 하면 됩니다:

1. **`terminal_command` 활용** (권장):  
   `widget.js`에서 `context.registerCommand('/mycmd', ...)`로 명령을 등록한 뒤, 사용자에게 스케줄러 config에 해당 명령을 추가하도록 안내.

2. **`api_call` 활용**:  
   `router.py`에 전용 엔드포인트를 만든 뒤, 스케줄러 config에 해당 URL을 등록.

> ⛔ **절대 `briefing_scheduler.js`에 새로운 `case`를 하드코딩하지 마십시오.** 범용 액션(`terminal_command`, `api_call`)으로 해결되지 않는 경우에만 검토하며, 그 경우에도 반드시 이 가이드에 문서를 추가해야 합니다.

### 7-5. 조건 감시 루틴 (Conditional Watch) — v1.8 구현

시간이 아닌 **데이터 조건**에 의해 트리거되는 루틴입니다. 기존 루틴과 같은 `routines` 배열에 포함되며, `condition` 필드가 있으면 조건 루틴으로 동작합니다.

#### Config 형식

```json
{
    "id": "temp_alert",
    "name": "고온 경고",
    "time": "every_1m",
    "action": "speak",
    "text": "현재 온도가 {{value}}도입니다. 기준치 {{threshold}}도를 넘었습니다.",
    "condition": {
        "source": "/api/plugins/home-assist/temperature",
        "field": "temp",
        "type": "number",
        "operator": ">=",
        "value": 28
    },
    "cooldown_min": 30,
    "days": [0, 1, 2, 3, 4, 5, 6],
    "enabled": true
}
```

#### 동작 흐름

1. 글로벌 틱(1분)마다 `condition.source` API를 폴링
2. 응답에서 `condition.field` 값을 추출
3. `condition.type` 기반 타입 변환 (아래 참조)
4. `condition.operator`로 `condition.value`와 비교
5. 조건 충족 시 `action` 실행 (TTS 텍스트에 템플릿 변수 치환)
6. `cooldown_min` 동안 재실행 억제

#### 타입 시스템 (`condition.type`)

`exports.sensors[].type`에서 선언된 타입에 따라 API 응답 값을 자동 변환합니다:

| type | API 응답 예시 | 변환 결과 | 사용 가능 연산자 |
|---|---|---|---|
| `number` | `"4.8°C"` 또는 `4.8` | `4.8` (parseFloat) | `>=`, `<=`, `>`, `<`, `==`, `!=` |
| `string` | `"RAINY"` | `"RAINY"` (변환 없음) | `==`, `!=` |
| `boolean` | `true`, `"false"` | `true/false` (Boolean) | `==`, `!=` |

> 💡 **개발자 책임**: `manifest.json`의 `exports.sensors[].type`을 정확히 선언하면, 스케줄러 엔진이 자동으로 올바른 비교를 수행합니다.

#### 템플릿 변수 (TTS 텍스트)

`speak` 액션의 `text` 필드에서 다음 변수를 사용할 수 있습니다:

| 변수 | 설명 | 예시 |
|---|---|---|
| `{{value}}` | 조건 충족 시점의 실제 센서 값 | `4.8`, `RAINY` |
| `{{threshold}}` | 사용자가 설정한 기준값 | `28`, `SUNNY` |

**사용 예시:**
```
현재 온도는 {{value}}도입니다. 기준치 {{threshold}}도 이하이므로 난방을 켜주세요.
```
→ 실행 시: *"현재 온도는 4.8도입니다. 기준치 24도 이하이므로 난방을 켜주세요."*

#### GUI 경험 (비개발자)

사용자는 루틴 에디터에서 Trigger를 **"조건 감시"**로 선택하면, 시스템이 모든 플러그인의 `manifest.json > exports.sensors`를 스캔하여 드롭다운으로 제공합니다:

```
감시 대상:  [ 드롭다운 ▼ ]
            ├── 🌡️ 현재 기온 (°C) — 환경 감시 유닛 (날씨)
            ├── 💧 현재 습도 (%) — 환경 감시 유닛 (날씨)
            ├── 📊 CPU 사용률 (%) — 하드웨어 모니터
            ├── 📊 메모리 사용률 (%) — 하드웨어 모니터
            └── 📈 KOSPI 지수 (pt) — 실시간 종목 모니터링

조건:       [ >= ▼ ]  [ 28 ]
쿨다운:     [ 30 ] 분
TTS Text:   현재 온도는 {{value}}도입니다.
```

> 💡 **사용자는 API URL, JSON 필드명, 데이터 타입을 알 필요가 없습니다.** 모든 기술적 세부사항은 개발자가 `manifest.json`의 `exports.sensors`에 선언하고, GUI가 이를 인간 친화적 인터페이스로 변환합니다.

---

## 🔄 8. 버전 히스토리

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
| v1.6 | 2026-02-28 | Plugin-X 아키텍처 최초 도입, 프론트엔드 격리 |
| v1.6.8 | 2026-03-01 | 백엔드 서비스 이관, 네임스페이스 격리, 패키지화 |
| v1.7 | 2026-03-02 | 정책 금지 규칙 명문화, 라우트 표준 강제, YT Music 경로 표준화, `terminal_notion.js` 제거(widget.js 통합), Loader Guard 문서화 |
| v1.7.1 | 2026-03-02 | 스케줄러 범용 액션(`terminal_command`, `api_call`) 추가, 루틴 매니저 GUI 고도화 |
| v1.8 | 2026-03-02 | **`exports` manifest 스펙** 구현, 조건 감시 루틴(Condition Watch) 구현, 타입 시스템(`number/string/boolean`), 템플릿 변수(`{{value}}`, `{{threshold}}`), `/exports` API, 4개 플러그인 manifest 업데이트 |
| v1.9 | 2026-03-02 | **`ENVIRONMENT_CONTROL` 권한 및 API** 도입, 전역 환경 시각효과(비, 눈, 번개) 동적 로딩 엔진 구현, 코어-플러그인 캡슐화 정책 강화 |
| v2.0 | 2026-03-03 | **에이전트 도구(Agent Tool) 아키텍처** 도입. 내부 데이터 조회 및 구글 검색 자동 선택 기능 구현 |
| v2.2 | 2026-03-03 | **Fixed HUD 레이아웃** 규격 명문화. 창 크기 조절 시 위치 고정 및 스타일 격리 정책 확립 |
| v2.3 | 2026-03-04 | 지능형 브리핑 컨트롤러(Proactive-Agent) 도입, 위젯별 선택적 데이터 수집(Selective Context), 설정 관리 표준 API 패턴 추가 |
| **v3.4.0** | 2026-03-07 | **Global I18n & BotManager** 도입. 통합 명령어 체계(/@, /, /#) 및 디스코드 어댑터 표준화 |

---

**AEGIS Plugin-X Standard v3.4.0 Documentation**
**이 문서는 AI 및 개발자 모두를 위한 구속력 있는 가이드입니다.**
**핵심 원칙: 사용자에게 JSON 편집을 강요하지 않는다.**
---

## 🤖 8. AI 응답 표준화 규격 (v2.1)

AI 서비스(Gemini, Hub 등)와의 통신 결과는 반드시 다음 규격을 따라야 합니다. 이는 터미널 출력과 음성 출력의 노이즈를 분리하기 위함입니다.

### 8-1. 표준 필드 정의

| 필드 | 용도 | 특징 |
|---|---|---|
| **`display`** | 시각적 출력 | 마크다운, 리치 텍스트를 포함할 수 있는 전체 응답. 터미널 로그에 직접 출력됩니다. |
| **`briefing`** | 음성/말풍선 | TTS용 순수 텍스트. 마크다운 기호를 포함하지 않으며, 자연스러운 구어체 문장으로 구성됩니다. |
| `sentiment` | 아바타 리액션 | 아바타의 표정/동작을 결정하는 감정 키워드 (`happy`, `neutral`, `serious`, `alert`). |
| `visual_type` | 시각적 힌트 | HUD 말풍선 아이콘 타입 (`weather`, `finance`, `calendar`, `email`, `system`, `none`). |

### 8-2. 액션 동기화 (Action Sync) ✨NEW
AI 응답 내에 **`[ACTION] SET_ALARM`** 과 같은 예약된 태그가 포함된 경우, `BotManager`가 이를 해석하여 즉시 등록된 플러그인의 핸들러를 실행하거나 시스템 액션을 트리거합니다.

### 8-3. 응답 처리 원칙 (⛔ 위반 금지)

1.  플러그인에서 AI 질의 결과를 가공할 때, `briefing` 필드가 없으면 `display` 필드에서 마크다운을 제거한 후 사용해야 합니다.
2.  사용자에게 직접 음성을 출력할 때는 반드시 `context.speak(display, briefing)`를 사용하여 **말풍선(display)**과 **음성(briefing)**을 분리하십시오.
3.  기본적으로 쿼리에 `--m` 또는 `--mute` 옵션이 있는 경우 프론트엔드(`ai_gateway.js`)에서 음성 출력을 자동으로 생략합니다.
4.  백엔드 서비스(`service.py`)에서는 `utils.clean_ai_text()`를 사용하여 AI의 응답 래퍼(```json 등)를 반드시 제거한 후 파싱하십시오.

---

## ⌨️ 9. 터미널 인텐트 (Intent) ও HUD 단축키 레이어 (v2.8)

모든 위젯과 플러그인 생태계를 묶어주는 것이 바로 **AEGIS Terminal** 인터페이스입니다. 

### 9-1. 터미널 제어 (Quake HUD)
사용자는 화면 어느 곳에서나 `Shift + ~` 를 눌러 터미널(지휘 통제소) HUD를 토글시킬 수 있습니다.

### 9-2. 통합 명령어 체계 (Unified Command routing v3.4)
v3.4.0 부터는 모든 메시징 인터페이스(Web, Discord)가 동일한 명령어 체계를 따릅니다.
* **`/@` (Hybrid)**: 로컬 컨텍스트(위젯 데이터) + 실시간 외부 검색을 결합한 지능형 추론 답변.
* **`/` (Local)**: 외부 검색을 차단하고 오직 로컬 위젯 데이터만을 요약하여 보안/정시 보고. (기존 별칭 명령 포함)
* **`/#` (Search)**: 컨텍스트 없이 순수하게 외부 검색 엔진만을 활용하여 답변.
* *(없음)*: 일반 대화 및 자율 판단 모드.

이 외에도 **`--m`** 또는 **`--mute`** 파라미터를 입력하면 소멸자로 작용하여 음성 지원 시스템을 침묵시킵니다. 터미널에서 `Shift + /` (기존) 단축키는 사용할 수 없으며 `/help` 명령을 통한 동적 조회도 강화되었습니다.

---

## ⚠️ 10. 공통 에러 및 해결 방법 (Troubleshooting)

### 10-1. 인터랙티브 요소 클릭 시 위젯이 이동하는 문제
AEGIS의 위젯은 기본적으로 드래그 가능한 컨테이너에 담겨 있습니다. 위젯 내부의 버튼이나 체크박스를 클릭할 때 이동 이벤트가 먼저 발생하는 것을 방지하려면 반드시 **이벤트 전파(Propagation)를 차단**해야 합니다.

**해결 방법:**
1. 모든 인터랙티브 요소(`button`, `input`, `checkbox` 등)의 핸들러에 `e.stopPropagation()`을 호출하고, `mousedown` 이벤트도 함께 차단하십시오.
2. 클릭이 가능한 `div`나 `span` 등 커스텀 컨테이너를 사용할 경우, 클래스에 **`.no-drag`**, **`.interactive`**, 또는 **`.clickable`** 중 하나를 반드시 포함하여 시스템 드래그 매니저의 간섭을 차단하십시오.

```javascript
// ✅ 표준 방어 코드 (HTML)
// <div class="plugin-item no-drag"> ... </div>

// ✅ 표준 방어 코드 (JS)
item.onclick = (e) => {
    e.stopPropagation(); 
    // 로직 수행
};
item.onmousedown = (e) => e.stopPropagation(); 
```

---

## 🧠 11. 통합 메시징 어댑터 (BotManager Integration) ✨NEW

플러그인이 새로운 메시징 채널(텔레그램, 슬랙 등)을 지원하도록 확장하려면 `BotAdapter` 규격을 따르십시오.

1.  **BotManager**: 모든 플랫폼의 입력을 받아 인텐트를 해석하고 적절한 플러그인 데이터를 수집합니다.
2.  **I18n Prompt**: AI 페르소나와 지침은 `config/i18n/`의 JSON 파일에서 관리됩니다. 백엔드에서 `utils.get_i18n(key, lang)`을 호출하여 다국어 프롬프트를 구성할 수 있습니다.
3.  **Cross-Platform Sync**: 웹 대시보드에서 일어난 전술적 변화(예: 알람 설정)는 `BotManager`를 통해 연결된 모든 봇 어댑터로 즉시 동기화될 수 있습니다.
