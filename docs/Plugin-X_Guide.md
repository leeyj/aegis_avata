# AEGIS Plugin-X: 확장 모듈 개발 가이드 (v3.7.0)

---

## ⚡ 0. 성능 아키텍처: AXC (AEGIS Extreme Cache)
v2.4.5부터 도입된 **AXC**는 플러그인의 부팅 속도를 극대화합니다.
- **IndexedDB**: 모든 플러그인 자산(HTML/JS/CSS)은 브라우저 IndexedDB에 영구 저장됩니다.
- **SHA256 Versioning**: 서버의 해시 값과 일치할 경우 네트워크 다운로드 없이 **10ms 미만**으로 즉시 로드됩니다.
- **Two-Step Hydration**: DOM 구조를 먼저 생성한 뒤 자산을 병렬로 주입하여, 로딩 속도와 레이어 정합성을 동시에 확보합니다.

---

## 📌 0. Plugin-X 핵심 정책 (반드시 읽을 것)

### 0-1. 아키텍처 방향성: 완전 독립 모듈화 & 확정적 제어
Plugin-X의 목표는 **각 플러그인이 메인 시스템과 물리적으로 분리된 독립 모듈**로 동작하는 것입니다. 플러그인은 핵심 코어(`app_factory.py`, `templates/index.html`, `static/js/` 등)를 수정하지 않고, 폴더를 추가하거나 삭제하는 것만으로 기능을 확장하거나 제거할 수 있어야 합니다. 또한 v3.7.0부터는 사용자의 명확한 의도(Command)에 대해 **AI의 개입 없이 즉각적이고 확정적인 반응(Deterministic Action)**을 제공하는 것을 최우선으로 합니다.

### 0-2. 절대 금지 사항 (⛔ HARD RULES)

| # | 정책 | 위반 시 발생하는 문제 |
|---|---|---|
| 1 | 플러그인의 로직을 **`/static/js/widgets/`** 또는 **`/services/`** 에 작성하지 마라 | 메인 시스템에 의존성이 발생하여 모듈 제거 시 코어가 깨짐 |
| 2 | 서비스 파일명을 **`service.py`** (일반명)로 만들지 마라 | 파이썬 네임스페이스 충돌로 다른 플러그인이 오동작 |
| 3 | 라우트 경로에 **`/api/plugins/[id]/`** 접두사 없이 단축 경로를 사용하지 마라 | 보안 시스템(`plugin_security_service`)이 플러그인을 식별하지 못해 권한 체크 우회 |
| 4 | `router.py`에서 **`import service`** 등 절대 경로 임포트를 사용하지 마라 | 글로벌 모듈 캐시 오염으로 엉뚱한 서비스가 로드됨 |
| 5 | 전역 객체(`window.XxxHandler`)를 **`index.html`의 `<script>` 태그**로 로드하지 마라 | Plugin-X 격리 원칙 위반. 모든 로직은 `widget.js` 내에서 완결되어야 함 |
| 6 | `widget.js`의 `init()` 외부에서 **Flask `request`/`session` 등 컨텍스트 의존 객체**를 참조하지 마라 | 앱 시작 시 블루프린트 탐색 과정에서 `RuntimeError: Working outside of request context` 발생 |
| 7 | **[v3.7.0]** 고정 명령어를 AI 프롬프트에만 의존하여 처리하지 마라 | AI 환각으로 인해 중요한 기능(알람, 재생 등)이 실행되지 않을 수 있음 |

### 0-3. 권장 사항 (✅ SOFT RULES)

- 플러그인 간 통신은 반드시 **`context` API** (Capability Proxy)를 경유한다.
- 전역 변수(`window.xxx`)를 사용해야 할 경우, `widget.js`의 `init()` 내부에서만 등록하고 `destroy()`에서 해제한다.
- **[v2.3]** 버튼, 체크박스 등 클릭 가능한 요소에는 반드시 `e.stopPropagation()`을 적용하고, 컨테이너가 클릭 가능할 경우 `.no-drag`, `.interactive`, `.clickable` 중 하나를 클래스에 포함하여 위젯 드래그(Move) 이벤트와의 간섭을 차단한다.
- `config.json`은 플러그인 내부에서만 참조하며, 다른 플러그인의 설정 파일을 직접 읽지 않는다.
- 터미널 명령어 핸들러는 `context.registerCommand()`로 등록하며, 별도의 외부 JS 파일을 만들지 않는다. (v3.7.0 이후는 manifest actions 권장)
- **[v2.4.5] AXC 무결성**: 위젯의 자산은 해시로 관리되므로, 개발 중에 수동으로 자산을 수정했다면 반드시 서버를 재시작하거나 브라우저 캐시를 삭제하여 해시 갱신을 트리거해야 한다.

---

## 🏗️ 1. 플러그인 표준 구조

모든 플러그인은 `/plugins` 디렉토리 하위에 고유한 폴더명을 가지며, 시스템 코드를 수정하지 않고 폴더 추가만으로 기능을 확장할 수 있습니다.

```text
/plugins/[plugin-id]/
├── __init__.py               # 파이썬 패키지 선언 (필수, 빈 파일)
├── manifest.json             # 필수 (Actions 정의 포함)
├── config.json               # 플러그인 전용 로컬 설정 (선택)
├── router.py                 # 필수 (Blueprint & initialize_plugin 포함)
├── {plugin_id}_service.py    # 필수 (명명 규칙 필수)
└── assets/                   # 프론트엔드 자산 폴더
    ├── widget.html           # HTML 조각 (Shadow DOM 주입용)
    ├── widget.js             # 로직 실행 모듈 (Init/Destroy + 신호 처리)
    └── widget.css            # 스타일 시트 (Shadow DOM 격리)
```

> ⚠️ **`__init__.py`가 없으면 상대 경로 임포트(`from .xxx_service import ...`)가 동작하지 않습니다.**

---

## 📜 2. manifest.json 작성 규격 (v3.7.0)

`manifest.json`은 플러그인의 정체성, **확정적 액션(Actions)**, 보안 권한(CSP), 백엔드 진입점을 정의하는 가장 중요한 파일입니다.

### 🎯 Actions 정의 (Deterministic Actions) ✨NEW
플러그인이 지원하는 확정적 명령어와 액션을 정의합니다. AI 판단 이전에 시스템에 의해 즉시 실행됩니다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `actions` | array | 플러그인이 수행 가능한 액션 리스트 |
| `actions[].id` | string | 액션 고유 ID (router.py 매핑용) |
| `actions[].name` | string | 사용자에게 표시될 액션 이름 |
| `actions[].commands` | string[] | 트리거 명령어 리스트 (한/영/단축키) |
| `actions[].params` | string[] | 명령어와 함께 전달될 파라미터 키 목록 |

### 필수/선택 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 플러그인 고유 ID (폴더명과 동일해야 함) |
| `name` | string | 사용자에게 표시되는 플러그인 이름 |
| `version` | string | 시맨틱 버전 |
| `entry.html` | string | 위젯 HTML 파일 경로 |
| `entry.js` | string | 위젯 JS 모듈 경로 |
| `entry.css` | string | 위젯 CSS 파일 경로 |
| `entry.backend` | string | 백엔드 라우터 파일명 (예: `"router.py"`) |
| `permissions` | string[] | 시스템 권한 목록 (`api.ai_agent`, `api.voice_service` 등) |
| `csp_domains` | object | CSP 외부 도메인 목록 (`script-src`, `frame-src`, `img-src`, `connect-src`) |
| `layout.default_size` | string | 기본 위젯 크기 (`size-1`, `size-1-5`, `size-2`) |
| `hidden` | boolean | `true`면 UI 패널 없이 백엔드만 로드 |
| `exports` | object | 스케줄러/외부 연동을 위한 공개 데이터 포인트 선언 |

### 전체 예시 (v3.7.0 기준 YouTube Music)

```json
{
    "id": "youtube-music",
    "name": "YouTube Music Player",
    "version": "3.7.0",
    "entry": {
        "html": "assets/widget.html",
        "js": "assets/widget.js",
        "css": "assets/widget.css",
        "backend": "router.py"
    },
    "actions": [
        {
            "id": "play",
            "name": "음악 재생",
            "commands": ["재생", "play", "p"],
            "params": ["query"]
        },
        {
            "id": "pause",
            "name": "일시 정지",
            "commands": ["정지", "pause", "s"]
        }
    ],
    "permissions": ["api.ai_agent", "api.voice_service"],
    "csp_domains": {
        "img-src": ["https://*.ytimg.com"],
        "connect-src": ["https://*.google.com"]
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

        // 2. HUD 실시간 동기화 (sync_cmd) ✨NEW
        window.addEventListener('sync_cmd', (e) => {
            if (e.detail.command === 'refresh_data') {
                this.refresh(); 
            }
        });

        // 3. 데이터 로드 & 렌더링
        const refresh = async () => { /* ... */ };
        this.refresh = refresh;
        await refresh();

        // 4. 글로벌 노출 (필요 시, init 내부에서만)
        window.refreshMyWidget = refresh;

        // 5. 정규 명령어 등록 (v3.7.0 이후는 manifest actions 우선)
        context.registerCommand('/[plugin-id]', (cmd) => this.refresh());

        // 6. 주기적 갱신
        this.updateTimer = setInterval(refresh, this.config.polling_interval_ms || 300000);
    },

    destroy: function () {
        if (this.updateTimer) clearInterval(this.updateTimer);
    }
};
```

> ⚠️ **명령어 핸들러는 반드시 이 export 객체 내부에 정의해야 합니다.** 별도의 `terminal_xxx.js` 파일을 만들어 `index.html`에서 로드하는 것은 정책 위반입니다.

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

## 🛠️ 4. 백엔드: 라우터 및 서비스 표준 (v3.7.0)

### 4-1. 확정적 액션 등록 패턴 (⛔ 필수 준수) ✨NEW
v3.7.0부터 모든 플러그인 라우터(`router.py`)는 서버 초기화 시점에 자신의 확정적 액션 핸들러를 등록해야 합니다.

```python
from services.plugin_registry import register_plugin_action

# [v3.7.0] 시스템에 의해 자동으로 호출되는 초기화 함수
def initialize_plugin():
    # manifest.json의 actions > id와 일치하는 핸들러 등록
    register_plugin_action("my-plugin-id", "play", handle_play)
    
def handle_play(params, target_id=None):
    """
    params: 사용자가 입력한 명령어 뒷부분 (문자열)
    target_id: 명령어를 보낸 플랫폼/사용자 식별자
    """
    # 1. 서비스 로직 호출
    result = MyService.play(params)
    
    # 2. 표준 응답 규격 반환
    return {
        "text": f"성공적으로 처리했습니다: {result}",
        "sync_cmd": "refresh_data" # 프론트엔드 동기화 신호
    }
```

### 4-2. 파일 명명 규칙 (⛔ 위반 금지)

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

### 4-3. 라우트 경로 규칙 (⛔ 위반 금지)

모든 백엔드 API 엔드포인트는 다음 패턴을 따라야 합니다:

```
/api/plugins/{plugin-id}/{action}
```

> 💡 **이유**: `plugin_security_service.py`의 `get_plugin_id_from_request()`가 URL의 3번째 세그먼트(`/api/plugins/[여기]`)에서 플러그인 ID를 추출합니다. 이 패턴을 벗어나면 **보안 권한 체크가 작동하지 않습니다.**

### 4-4. 임포트 규격 및 유틸리티 (⛔ 위반 금지)

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

### 4-5. router.py 표준 골격

```python
import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from .{plugin_id}_service import MyService    # 상대 경로 임포트
from utils import load_json_config
from services import require_permission
from services.plugin_registry import register_context_provider, register_plugin_action

# 0. 초기화 표준 핸들러
def initialize_plugin():
    # 확정적 액션 등록
    register_plugin_action("{plugin-id}", "action_id", my_handler)
    # 기존 브리핑 공급자 등록
    register_context_provider("{plugin-id}", get_my_context)

# 1. 데이터 조회 (기록용)
@login_required
def get_my_context():
    return MyService.get_data()

# 2. 액션 핸들러
def my_handler(params, target_id=None):
    result = MyService.do_action(params)
    return {"text": f"처리를 완료했습니다: {result}", "sync_cmd": "refresh"}
```

---

## 🤖 5. AI 응답 표준화 및 프롬프트 정책 (v3.0) ✨NEW

시스템의 일관성 있는 페르소나와 깨끗한 응답을 위해 다음 프롬프트 정책을 준수해야 합니다.

### 5-1. 프롬프트 탈-하드코딩 (De-hardcoding)
AI 에이전트의 이름("AEGIS")이나 응답 레이블("Response:") 등을 프롬프트 내부에 하드코딩하지 마십시오. 모든 지시사항은 `prompts.json`을 통해 로드되며, 시스템이 동적으로 주입하는 컨텍스트를 활용해야 합니다.

### 5-2. 응답 정제 규격
AI가 마크다운 래퍼(```json) 등을 포함하여 응답하더라도 시스템은 `utils.clean_ai_text()`를 통해 이를 자동으로 제거합니다. 특히 TTS용 `briefing` 필드에는 절대로 마크다운 기호가 포함되지 않도록 프롬프트에서 지시해야 합니다.

---

## 🛡️ 5. 보안 및 디자인 가이드

### 5-1. CSS 격리 (Shadow DOM Boundary)
- 플러그인의 스타일은 Shadow DOM 내부에 캡슐화되어 외부 페이지를 오염시키지 않습니다.
- 시스템 표준 CSS 변수(`--neon`, `--glass`, `--bg-dark`)를 사용하여 전체 디자인 톤을 유지하십시오.

### 5-2. CSP (Content Security Policy) 및 도메인 포맷
- 외부 리소스를 불러올 때 `manifest.json`의 `csp_domains`에 반드시 도메인을 등록해야 합니다. **미등록 시 Frontend fetch가 브라우저에 의해 즉시 차단(Block)됩니다.**

### 5-3. 리소스 해제 (Memory Leak 방지)
- `destroy()` 함수에서 `setInterval`, `setTimeout`, 이벤트 리스너를 반드시 해제하십시오.

---

## 🛠️ 6. 설정 관리 인터페이스 (Config Management) ✨NEW

플러그인이 자체적인 저장 공간(`config.json`)을 가질 경우, 프론트엔드 UI에서 이를 수정할 수 있도록 다음 표준 엔드포인트를 구현할 것을 권장합니다.

```python
@plugin_bp.route("/api/plugins/{id}/config", methods=["GET", "POST"])
@login_required
def handle_config():
    # ... (상세 구현 생략, utils.save_json_config 사용 필수)
```

---

## 💅 7. 프리미엄 디자인 가이드 (Aesthetics) ✨NEW

AEGIS의 위젯은 단순한 정보 전달을 넘어 시각적으로 "와우(WOW)"한 경험을 주어야 합니다.
1. **Typography**: 기본 폰트 대신 `Google Fonts (Inter, Outfit, Roboto)`를 사용하십시오.
2. **Glassmorphism**: `backdrop-filter: blur(12px)`)와 반투명 배경을 조합하여 깊이감을 부여하십시오.

---

## 📐 6. Loader 동작 원리 (참고)

`discover_plugin_blueprints()` 함수가 앱 시작 시 초기화를 수행하며, 각 플러그인의 `initialize_plugin()`을 자동으로 호출하여 액션을 레지스트리에 등록합니다.

---

## ⏰ 7. 스케줄러 연동: 범용 루틴 등록 (v1.7.1)

스케줄러(`plugins/scheduler`)는 시간 기반 자동 실행을 담당합니다. 플러그인은 스케줄러 코드를 직접 수정하지 않고, **`config.json`에 루틴을 추가하는 것만으로** 자신의 기능을 예약할 수 있습니다.

### 7-2. `terminal_command` — 플러그인 명령어 예약 실행
`CommandRouter`에 등록된 **어떤 명령어든** 스케줄에 등록할 수 있습니다. v3.7.0 이후부터는 명확한 기능을 수행할 때 확정적 액션(Deterministic Actions)을 호출하는 명령어를 사용하십시오.

### 7-5. 조건 감시 루틴 (Conditional Watch) — v1.8 구현

시간이 아닌 **데이터 조건**에 의해 트리거되는 루틴입니다. `manifest.json`의 `exports.sensors[]`에서 선언된 타입에 따라 API 응답 값을 자동 변환하여 비교합니다.

---

## 🔄 8. 버전 히스토리

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
| v1.6 | 2026-02-28 | Plugin-X 아키텍처 최초 도입 |
| v2.4.5 | 2026-03-04 | **AXC (Extreme Cache)** 및 병렬 로딩 도입 |
| v3.4.0 | 2026-03-07 | **Global I18n & BotManager** 도입 |
| **v3.7.0** | 2026-03-08 | **확정적 제어(Deterministic Actions)** 및 **HUD 실시간 동기화(sync_cmd)** 도입 |

---

## 🤖 8. AI 응답 표준화 규격 (v2.1)

AI 서비스와의 통신 결과는 반드시 `display`와 `briefing`으로 분리하십시오.
- **`display`**: 시각적 출력 (마크다운 포함 가능)
- **`briefing`**: 음성용 순수 텍스트 (마크다운 불허)

---

## ⌨️ 9. 통합 명령어 체계 & 우선순위 (v3.7.0) ✨NEW

v3.7.0부터 `BotManager`는 다음 우선순위에 따라 명령어를 라우팅합니다.

1.  **System Core**: `/config`, `/help` 등 시스템 명령.
2.  **Deterministic Actions**: `manifest.json`에 정의된 확정적 명령어 (AI 판단 없음).
3.  **Hybrid Context (@)**: 지정 위젯 데이터 + 외부 검색 AI 정보.
4.  **Local Context (/)**: 로컬 위젯 데이터 요약 AI 보고.
5.  **AI Fallback**: 위의 규칙에 매칭되지 않는 일반 자연어 질문.

---

## ⚠️ 10. 공통 에러 및 해결 방법 (Troubleshooting)

### 10-1. 인터랙티브 요소 클릭 시 위젯이 이동하는 문제
해결 방법: 클래스에 **`.no-drag`**, **`.interactive`**, 또는 **`.clickable`** 중 하나를 반드시 포함하여 시스템 드래그 매니저의 간섭을 차단하십시오.

---

## 🧠 11. 통합 메시징 어댑터 (BotManager Integration)

플러그인이 새로운 메시징 채널을 지원하도록 확장하려면 `BotAdapter` 규격을 따르십시오. 모든 플랫폼의 입력을 `BotManager`가 중앙에서 제어합니다.

---
**AEGIS Plugin-X Standard v3.7.0 Documentation**
**이 문서는 AI 및 개발자 모두를 위한 구속력 있는 가이드입니다.**
**핵심 원칙: 사용자에게 JSON 편집을 강요하지 않는다.**
