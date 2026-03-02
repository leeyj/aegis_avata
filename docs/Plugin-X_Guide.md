# AEGIS Plugin-X: 확장 모듈 개발 가이드 (v1.9)

AEGIS Plugin-X는 대시보드의 모든 위젯과 기능을 **완벽하게 독립된 모듈**로 분리하여 관리하는 차세대 아키텍처입니다. 본 가이드는 최신 **v1.9 표준 규격(Environment Control 기능 추가)**을 설명하며, **모든 AI 및 개발자는 이 문서의 정책을 반드시 준수**해야 합니다.

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
- `config.json`은 플러그인 내부에서만 참조하며, 다른 플러그인의 설정 파일을 직접 읽지 않는다.
- 터미널 명령어 핸들러는 `context.registerCommand()`로 등록하며, 별도의 외부 JS 파일을 만들지 않는다.

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
| `permissions` | string[] | 시스템 권한 목록 |
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

## 🧩 3. 프론트엔드: 런타임 환경 (Capability Proxy)

플러그인이 로드되면 `init(shadowRoot, context)` 함수가 호출됩니다. **`context` 객체를 통해서만** 시스템 자원에 접근합니다.

### Context API 목록

| API | 설명 |
|---|---|
| `context.log(msg)` | 콘솔 로그 (플러그인 태그 자동 부여) |
| `context._t(key)` | i18n 번역 |
| `context.applyI18n()` | Shadow DOM 내부 재번역 |
| `context.askAI(task, data)` | AI Gateway 요청 (권한 필요) |
| `context.speak(text, audioUrl, visualType)` | TTS 발화 |
| `context.appendLog(tag, message)` | 터미널 로그 출력 |
| `context.registerCommand(prefix, callback)` | 터미널 명령어 등록 |
| `context.registerTtsIcon(type, icon)` | TTS 아이콘 등록 |
| `context.triggerReaction(type, data, timeout)` | 아바타 리액션 트리거 |
| `context.triggerBriefing(feedbackEl, options)` | 전략 브리핑 실행 |
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

        // 4. 명령어 등록 (터미널 연동)
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

### 4-3. 임포트 규칙 (⛔ 위반 금지)

```python
# ✅ 올바른 임포트 (상대 경로)
from .notion_service import NotionService

# ❌ 잘못된 임포트 (절대 경로 → 네임스페이스 충돌 유발)
from notion_service import NotionService
import service
```

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
```

---

## 🛡️ 5. 보안 및 디자인 가이드

### 5-1. CSS 격리 (Shadow DOM Boundary)
- 플러그인의 스타일은 Shadow DOM 내부에 캡슐화되어 외부 페이지를 오염시키지 않습니다.
- 시스템 표준 CSS 변수(`--neon`, `--glass`, `--bg-dark`)를 사용하여 전체 디자인 톤을 유지하십시오.

### 5-2. CSP (Content Security Policy)
- 외부 리소스를 불러올 때 `manifest.json`의 `csp_domains`에 반드시 도메인을 등록해야 합니다.
- 와일드카드(`*.domain.com`)와 루트 도메인(`domain.com`)을 각각 명시하십시오.

### 5-3. 리소스 해제
- `destroy()` 함수에서 `setInterval`, `setTimeout`, 이벤트 리스너를 반드시 해제하십시오.
- 해제하지 않으면 위젯이 제거된 이후에도 백그라운드에서 리소스를 소모합니다.

### 5-4. 에러 핸들링
- `fetch()` 호출은 반드시 `try/catch`로 감싸고, 사용자에게 적절한 에러 메시지를 표시하십시오.
- 백엔드 라우트 함수도 `try/except`로 감싸고, 에러 시 `{"success": false, "message": "..."}` 형식으로 반환하십시오.

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

---
**AEGIS Plugin-X Standard v1.8 Documentation**
**이 문서는 AI 및 개발자 모두를 위한 구속력 있는 가이드입니다.**
**핵심 원칙: 사용자에게 JSON 편집을 강요하지 않는다.**
