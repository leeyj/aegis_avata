# AEGIS Plugin-X: 확장 모듈 개발 가이드 (v4.0.0)

본 문서는 AEGIS 대시보드 시스템의 확장 기능을 개발하기 위한 공식 프레임워크인 **Plugin-X**의 모든 명세와 가이드라인을 담고 있습니다. v4.0.0에서는 **Iframe 기반의 물리적 격리**와 **AXC(AEGIS Extreme Cache)**를 통한 초고속 로딩이 적용되었으며, 모든 플러그인 개발은 본 문서의 규격과 철학을 100% 준수해야 합니다.

> [!IMPORTANT]
> **"문서에 없는 기능은 존재하지 않는 기능이다."**
> AEGIS는 극도의 모듈화와 예측 가능성을 지향합니다. 본 가이드에서 설명하는 패턴과 명세를 벗어난 구현은 지원되지 않으며, 누락된 필드나 규격은 즉시 보고하여 반영해야 합니다. 본 문서는 이전 모든 버전의 기술적 세부사항을 통합하고 v4.0.0 아키텍처로 최신화한 최종본입니다.

---

## ⚡ 0. v4.0 아키텍처 핵심: Iframe 격리 & AXC

v4.0부터 AEGIS는 더욱 강력한 보안과 성능을 위해 아키텍처를 전면 개편했습니다.

- **Iframe Isolation (v4.0 핵심)**: 모든 위젯은 독립된 Iframe 내에서 실행됩니다. 이는 레거시 Shadow DOM의 한계(Global CSS 변수 오염, JS 전역 객체 충돌 등)를 물리적으로 해결하여 완벽한 보안 거리를 확보합니다.
- **AXC (AEGIS Extreme Cache)**: 모든 플러그인 자산(HTML/JS/CSS)은 브라우저 IndexedDB에 SHA256 해시로 버전 관리되며, 네트워크 다운로드 없이 **10ms 미만**으로 즉시 로드됩니다.
- **Parallel Hydration**: DOM 구조를 먼저 생성한 뒤 자산 로드 및 `init()` 처리를 병렬로 주입하여, 로딩 속도와 레이어 정합성을 동시에 확보합니다. (v2.4.5부터 도입된 최적화 파이프라인의 완성형)
- **ES Modules & Dynamic Loading**: `import/export`를 지원하며, `context.resolve()`를 통해 위젯 로직을 `api.js`, `renderer.js` 등으로 분리하여 효율적으로 관리할 수 있습니다.

---

## 📌 0. Plugin-X 핵심 정책 (반드시 숙달할 것)

### 0-1. 아키텍처 방향성: 완전 독립 모듈화 & 확정적 제어
Plugin-X의 목표는 **각 플러그인이 메인 시스템과 물리적으로 분리된 독립 모듈**로 동작하는 것입니다. 플러그인은 핵심 코어(`app_factory.py`, `gods.py`, `index.html` 등)를 수정하지 않고, 폴더를 추가하거나 삭제하는 것만으로 기능을 확장하거나 제거할 수 있어야 합니다.

또한, **Determinism First** 원칙에 따라 사용자의 명확한 명령어(Command)에 대해서는 AI의 판단을 거치지 않고 등록된 핸들러가 즉각적으로 반응해야 합니다. (v3.7.0 이후 핵심 원칙)

### 0-2. 절대 금지 사항 (⛔ HARD RULES)

| # | 정책 | 위반 시 발생하는 문제 |
|---|---|---|
| 1 | 플러그인의 로직을 **`/static/js/widgets/`** 또는 **`/services/`** 에 작성하지 마라 | 메인 시스템에 의존성이 발생하여 모듈 제거 시 코어가 깨짐 |
| 2 | 서비스 파일명을 **`service.py`** (일반명)로 만들지 마라 | 파이썬 네임스페이스 충돌로 다른 플러그인이 오동작 |
| 3 | 라우트 경로에 **`/api/plugins/[id]/`** 접두사 없이 단축 경로를 사용하지 마라 | 보안 시스템(`plugin_security_service`)이 플러그인을 식별하지 못해 권한 체크 우회 |
| 4 | `router.py`에서 **`import service`** 등 절대 경로 임포트를 사용하지 마라 | 글로벌 모듈 캐시 오염으로 엉뚱한 서비스가 로드됨 |
| 5 | **[v4.0]** `widget.html` 내부에 `<script>` 태그를 작성하지 마라 | Iframe 주입 방식 특성상 내부 스크립트는 실행되지 않음. 모든 로직은 `widget.js`에 작성 |
| 6 | `widget.js`의 `init()` 외부에서 **Flask `request`/`session` 등 컨텍스트 의존 객체**를 참조하지 마라 | 앱 시작 시 블루프린트 탐색 과정에서 `RuntimeError: Working outside of request context` 발생 |
| 7 | 고정 명령어를 AI 프롬프트에만 의존하여 처리하지 마라 | AI 환각으로 인해 중요한 기능(알람, 재생 등)이 실행되지 않을 수 있음 |

### 0-3. 권장 사항 (✅ SOFT RULES)

- 플러그인 간 통신은 반드시 **`context` API** (Capability Proxy)를 경유한다.
- **이벤트 위임(Event Delegation)** 활용: 개별 요소에 `onclick`을 붙이는 대신, `root.addEventListener('click', ...)`와 `data-action` 속성을 조합하여 사용한다.
- **ES 모듈 분리**: 위젯 로직이 길어질 경우 `assets/api.js`, `assets/ui.js` 등으로 분리하고 `context.resolve()`로 임포트한다.
- 버튼, 체크박스 등 클릭 가능한 요소에는 반드시 **`e.stopPropagation()`**을 적용하고, 컨테이너가 클릭 가능할 경우 `.no-drag`, `.interactive`, `.clickable` 중 하나를 클래스에 포함하여 위젯 드래그(Move) 이벤트와의 간섭을 차단한다.
- `config.json`은 플러그인 내부에서만 참조하며, 다른 플러그인의 설정 파일을 직접 읽지 않는다.

---

## 🏗️ 1. 플러그인 표준 구조

모든 플러그인은 `/plugins` 디렉토리 하위에 고유한 폴더명을 가지며, 시스템 코드를 수정하지 않고 폴더 추가만으로 기능을 확장할 수 있습니다.

```text
/plugins/[plugin-id]/
├── __init__.py               # 파이썬 패키지 선언 (필수, 빈 파일)
├── manifest.json             # 필수 (Actions 정의 및 권한 포함)
├── config.json               # 플러그인 전용 로컬 설정 (선택)
├── router.py                 # 필수 (Blueprint & initialize_plugin 포함)
├── {plugin_id}_service.py    # 필수 (명명 규칙 필수)
└── assets/                   # 프론트엔드 자산 폴더
    ├── widget.html           # HTML 조각 (Iframe 주입용)
    ├── widget.js             # 로직 실행 모듈 (Init/Destroy)
    ├── widget.css            # 스타일 시트 (격리됨)
    ├── api.js                # [권장] 백엔드 통신 전용 모듈 (ES Module)
    └── renderer.js           # [권장] UI 렌더링 전용 모듈 (ES Module)
```

---

## 📜 2. manifest.json 상세 규격 (v4.0.0 전수 조사 결과)

`manifest.json`은 플러그인의 정체성, 보안 권한, 레이아웃 및 외부 연동 사양을 정의합니다.

### 2-1. Top-Level 필드 목록

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | ✅ | 플러그인 고유 ID (폴더명과 반드시 동일) |
| `name` | string | ✅ | 사용자에게 표시되는 플러그인 이름 |
| `version` | string | ✅ | 시맨틱 버전 (예: `"4.0.0"`) |
| `author` | string | ❌ | 플러그인 제작자 |
| `description` | string | ❌ | 플러그인에 대한 상세 설명 |
| `icon` | string | ✅ | 표시될 아이콘 (이모지 또는 아이콘 클래스) |
| `priority` | number | ❌ | 로딩 우선순위 (낮을수록 먼저 로드됨. 기본값 100) |
| `complexity` | number | ❌ | 기능 복잡도 지수 (0~3) |
| `hybrid_level` | number | ✅ | **[v4.0]** 격리 수준 (1: 시스템, 2: 표준 Iframe, 3: 하이브리드) |
| `hidden` | boolean | ❌ | `true`일 경우 UI 대시보드에서 숨겨지고 백엔드 서비스만 동작 |
| `entry` | object | ✅ | 진입점 파일 경로 정의 (`html`, `js`, `css`, `backend`) |
| `permissions` | string[] | ❌ | 필요한 시스템 API 권한 목록 (`api.ai_gateway`, `api.media_proxy` 등) |
| `csp_domains` | object | ❌ | 외부 리소스 허용 도메인 (`img-src`, `connect-src` 등) |
| `layout` | object | ❌ | 위젯 배치 및 크기 사양 |
| `exports` | object | ❌ | 타 플러그인(스케줄러 등)과의 연동 규격 |
| `actions` | array | ❌ | 확정적 명령어 및 AI 연동 액션 정의 |

### 2-2. `entry` 객체 상세
- `html`: 위젯 구조 파일 (예: `"assets/widget.html"`)
- `js`: 실행 로직 파일 (예: `"assets/widget.js"`)
- `css`: 스타일 시트 파일 (예: `"assets/widget.css"`)
- `backend`: 파이썬 라우터 파일 (예: `"router.py"`)

### 2-3. `layout` 객체 상세 (v2.2 고정 위젯 규격 포함)
- `default_size`: 기본 위젯 크기 (`"size-1"`, `"size-1-5"`, `"size-2"`)
- **`fixed`**: `true`일 경우 위젯 이동이 차단되고 전역 위치 재계산 대상에서 제외되어 특정 위치(예: 0, 0)에 고정됨 (HUD 스타일 전용)
- **`zIndex`**: 고정형 위젯의 레이어 순서 지정 (숫자가 높을수록 상단)

### 2-4. `actions` (Deterministic Actions) 규격 ✨NEW (v3.7.0+)
사용자의 명확한 명령어에 대해 AI 판단 없이 즉시 실행될 액션을 정의합니다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 액션 고유 ID (router.py의 핸들러 매핑용) |
| `name` | string | 사용자에게 표시될 액션 이름 |
| `commands` | string[] | 트리거 명령어 리스트 (예: `["재생", "play", "p"]`) |
| `params` | string[] | 명령어와 함께 전달될 파라미터 키 목록 (예: `["query"]`) |

---

## 🎯 3. `exports` 연동 규격 (Inter-plugin Discovery)

`exports` 섹션은 해당 플러그인의 데이터와 기능을 루틴 매니저(스케줄러)가 자동으로 발견하고 활용할 수 있게 합니다.

### 3-1. `exports.sensors[]` (상태 감시 및 조건 트리거)
센서는 루틴의 '조건'으로 사용될 데이터를 노출합니다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 센서 고유 ID (플러그인 내 유일) |
| `name` | string | 사용자용 이름 (예: "실내 온도", "현재 재생중") |
| `unit` | string | 단위 표시 (예: "°C", "%", "boolean", "text") |
| `type` | string | 데이터 타입 (`number`, `string`, `boolean`) |
| `endpoint` | string | 데이터를 조회할 API 경로 (예: `"/api/plugins/weather/data"`) |
| `field` | string | API 응답 JSON에서 값을 추출할 경로 (Dot notation 지원, 예: `"status.temp"`) |

### 3-2. `exports.commands[]` (터미널 명령어 가이드)
사용자 및 AI가 사용할 수 있는 터미널 명령어 가이드를 제공합니다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `prefix` | string | 명령어 접두사 (예: `"/yt"`, `"/ns"`) |
| `name` | string | 명령어 이름/설명 |
| `examples` | string[] | 실제 사용 예시 리스트 |

### 3-3. `exports.actions[]` (자동화 액션 실행) ✨NEW
루틴의 '동작'으로 사용될 확정적 액션을 노출합니다.

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 액션 고유 ID |
| `name` | string | 사용자용 액션 이름 (예: "음악 일시정지", "뉴스 브리핑") |
| `description` | string | 액션에 대한 상세 설명 |
| `type` | string | 실행 방식 (`"terminal_command"` 표준) |
| `payload` | object | 실행 시 필요한 데이터 (예: `{ "command": "/yt pause" }`) |

---

## 🧪 4. 실전 튜토리얼 및 예시

### 4-1. 복합 예시: mp3-player 플러그인 (v4.0 최신 규격)
로컬 미디어 파일을 다루고 AI 브리핑을 지원하는 `mp3-player`의 `manifest.json` 예시입니다.

```json
{
    "id": "mp3-player",
    "name": "로컬 미디어 허브",
    "version": "4.0.0",
    "icon": "🎵",
    "priority": 50,
    "hybrid_level": 2,
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
    },
    "exports": {
        "sensors": [
            {
                "id": "is_playing",
                "name": "재생 여부",
                "unit": "boolean",
                "type": "boolean",
                "endpoint": "/api/plugins/mp3-player/status",
                "field": "playing"
            }
        ],
        "actions": [
            {
                "id": "stop_music",
                "name": "음악 중단",
                "description": "현재 재생 중인 모든 로컬 음악을 즉시 중단합니다.",
                "type": "terminal_command",
                "payload": { "command": "/mp3 pause" }
            }
        ]
    }
}
```

### 4-2. 외부 설정 연동 (config.json)
미디어 폴더와 같은 무거운 자산이나 보안이 필요한 경로는 `config.json`을 통해 외부 주입받는 방식을 권장합니다.
- **`plugins/mp3-player/config.json`**:
  ```json
  { "media_directory": "D:\\MyMusic", "polling_interval": 300000 }
  ```
- **백엔드 처리**: `router.py`에서 `utils.load_json_config`를 통해 위 경로를 로드하여 처리합니다.

---

## 🧩 5. 프론트엔드: 런타임 환경 (Capability Proxy)

v4.0에서 플러그인이 로드되면 `init(root, context)` 함수가 호출됩니다. 모든 시스템 자원 접근은 **`context` 객체**를 통해서만 수행되어야 합니다.

### 5-1. Context API 목록 (v4.0 상세)

| API | 설명 |
|---|---|
| `context.resolve(path)` | **[v4.0 필수]** 내부 자산 경로를 절대 URL로 변환. ES 모듈 `import()` 시 필수 사용. |
| `context.requestCore(cmd, d)` | 시스템 코어 명령(RELOAD_CONFIG, NOTIFY, REFRESH_UI 등) 호출. |
| `context.onSystemEvent(e, cb)`| 시스템 전역 이벤트(SYNC_CMD, SYNC_DATA, THEME_CHANGE) 리스너 등록. |
| `context.log(msg)` | 콘솔 로그 출력 (플러그인 태그가 자동으로 포함됨). |
| `context._t(key)` | i18n 번역 조회 (`i18n.json` 연동). |
| `context.askAI(task, data)` | AI Gateway 요청 및 구조화된 응답(display/briefing) 수신. |
| `context.speak(disp, brief)` | 통합 TTS 및 메시지 발화. 아바타 립싱크 및 말풍선 싱크 자동 처리. |
| `context.appendLog(tag, msg)` | 시스템 터미널 하단 로그창에 실시간 텍스트 추가. |
| `context.registerCommand(p, c)`| 터미널 명령어 직접 등록 및 콜백 지정. |
| `context.triggerReaction(t, d)`| 아바타의 특정 모션 또는 감정 리액션 트리거. |
| `context.playMotion(alias)` | 사용자가 스튜디오에서 지정한 Custom Alias 기반 모션 재생. |
| `context.changeModel(name)` | Live2D 모델 실시간 전환. |
| `context.getMediaList()` | `api.media_proxy` 권한 기반 미디어 파일 목록 조회. |
| `context.getAudioUrl(file)` | 미디어 파일을 브라우저에서 재생 가능한 스트리밍 URL로 변환. |
| `context.environment.applyEffect(type)`| 전역 환경 시각효과(RAINY, SNOWY, STORM, CLEAR) 트리거. |

---

## ⌨️ 6. 위젯 프론트엔드 표준 구현 패턴

### 6-1. widget.js 표준 골격 (v4.0 & Event Delegation)
v4.0부터는 개별 버튼에 `onclick`을 붙이는 대신 `root`에서 **이벤트 위임**을 통해 통합 관리하는 것을 원칙으로 합니다.

```javascript
/**
 * AEGIS v4.0 Standard Plugin Implementation
 */
export default {
    updateTimer: null,
    root: null,
    ctx: null,

    /**
     * @param {HTMLElement} root - Iframe의 body 엘리먼트 (격리된 DOM 루트)
     * @param {Object} context - 시스템 기능 프록시 객체
     */
    init: async function (root, context) {
        this.root = root;
        this.ctx = context;
        context.log("Widget Initialize Starting...");

        // 1. 이벤트 위임 표준 (data-action 기반)
        // ⛔ stopPropagation 필수: 위젯 자체의 드래그(Move) 이벤트와의 충돌 방지
        root.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            e.stopPropagation(); 

            const action = btn.getAttribute('data-action');
            if (action === 'refresh') this.refresh();
            if (action === 'play') this.handlePlay();
        });

        // 2. 외부 ES 모듈 동적 로딩 (선택)
        const apiPath = context.resolve('assets/api.js');
        const { default: Api } = await import(apiPath);
        this.api = new Api(context.id);

        // 3. 초기 데이터 로드 및 폴링 시작
        await this.refresh();
        this.updateTimer = setInterval(() => this.refresh(), 300000);
        
        context.log("Widget Initialize Done.");
    },

    refresh: async function() {
        try {
            const data = await this.api.fetchData();
            // 모든 DOM 접근은 전달받은 this.root 내에서만 수행되어야 함
            this.root.querySelector('#status-text').textContent = data.message;
        } catch (e) {
            this.ctx.log("Refresh fail: " + e.message);
        }
    },

    destroy: function () {
        // 리소스 해제 (Memory Leak 방지 필수)
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.root = null;
        this.ctx = null;
    }
};
```

### 6-2. 위젯 라이프사이클 (Lifecycle) 상세
시스템은 위젯을 다음과 같은 단계로 관리합니다:
1. **Injection (주입)**: 시스템이 `manifest.json`의 `entry.html`을 Fetch한 뒤, Iframe 내부의 Body에 주입합니다.
   - ⚠️ **주의**: `innerHTML`을 통해 주입되므로 **`widget.html` 내부에 `<script>` 태그를 작성해도 브라우저는 이를 실행하지 않습니다.** 모든 로직은 반드시 `widget.js`에 작성하십시오.
2. **Initialization (초기화)**: HTML 주입 직후, `widget.js`의 `init(root, context)`가 단 1회 호출됩니다.
3. **Destruction (파괴)**: 사용자가 위젯을 닫거나 새로고침할 때 `destroy()`가 호출됩니다. 여기서 타이머나 글로벌 리스너를 정리하지 않으면 시스템 성능 저하의 원인이 됩니다.

---

## 🛠️ 7. 백엔드: 라우터 및 서비스 표준

### 7-1. initialize_plugin (⛔ 필수 준수 핸들러)
모든 플러그인 라우터(`router.py`)는 시스템 부팅 시 액션 핸들러를 등록하기 위한 `initialize_plugin()` 함수를 반드시 구현해야 합니다.

```python
from services.plugin_registry import register_plugin_action, register_context_provider

def initialize_plugin():
    # 1. 확정적 액션 등록 (manifest.json > actions > id 매핑)
    register_plugin_action("my-plugin", "play", handle_play_cmd)
    
    # 2. 브리핑 시스템을 위한 컨텍스트 공급자(Context Provider) 등록
    # aliases를 등록하면 터미널에서 / 또는 Slash 없이 한글 별칭으로 즉시 호출 가능
    register_context_provider("my-plugin", get_current_info, aliases=["상태", "보고"])

def handle_play_cmd(params, target_id=None):
    # 비즈니스 로직 호출...
    return {
        "text": "성공적으로 실행했습니다.",
        "sync_cmd": "RELOAD_WIDGET" # 프론트엔드 동기화 신호
    }
```

### 7-2. 파일 명명 및 경로 규칙 (⛔ 위반 금지)
- **Service**: `{plugin_id에서 하이픈을 언더스코어로 변환}_service.py` 형식을 엄수하십시오.
- **Route**: 반드시 `@plugin_bp.route("/api/plugins/{id}/...")` 형식을 따라야 합니다. 이는 `plugin_security_service`가 플러그인을 식별하여 권한을 체크하는 유일한 기준입니다.

---

## 🤖 8. AI 응답 표준화 및 프롬프트 정책 (v3.0+)

### 8-1. 표준 필드 규격
AI 서비스(Gemini 등)와의 통신 결과는 반드시 다음 규격을 따라 터미널 출력과 음성 출력의 노이즈를 분리해야 합니다.

| 필드 | 용도 | 특징 |
|---|---|---|
| **`display`** | 시각적 출력 | 마크다운이 포함된 레이아웃 데이터. 터미널 로그에 직접 표시됨. |
| **`briefing`** | 음성/구어체 | TTS용 순수 텍스트. 마크다운 기호를 포함하지 않는 자연스러운 구어체. |
| `sentiment` | 아바타 리액션 | 아바타의 감정 키워드 (`happy`, `serious`, `alert` 등). |
| `visual_type` | 말풍선 아이콘 | HUD 말풍선 상단에 표시될 아이콘 타입. |

### 8-2. 응답 정제 규격
백엔드에서는 AI의 응답에 포함된 마크다운 래퍼(```json 등)를 `utils.clean_ai_text()`를 통해 반드시 제거한 후 파싱해야 합니다.

---

## ⌨️ 9. 터미널 인텐트 (Intent) & 라우팅 가이드

터미널 입력 첫 문자를 통해 시스템은 AI의 개입 여부와 데이터 주입 범위를 즉각 판단합니다.

- **`#` (확정적 웹 검색)**: AI 인출 대신 구글 검색 도구를 강제하여 실시간 정보를 가져옵니다.
- **`@` (컨텍스트 다중 알리아스 지원)**: 해당 플러그인의 상태 데이터를 AI 대답에 강제로 주입합니다. (예: `@날씨 내일 비와?`)
- **`/` (직접 명령 처리)**: 특정 플러그인에 등록된 명령어를 즉시 실행합니다. (AI 판단 없음)
- **없음**: 시스템 AI(Gemini/Ollama)의 자율 판단 및 대화.

---

## ⚠️ 10. 공통 에러 및 해결 방법 (Troubleshooting)

### 10-1. 인터랙티브 요소 클릭 시 위젯이 이동하는 문제
해결 방법: 모든 클릭 가능 요소 핸들러에 `e.stopPropagation()`을 호출하고, 클래스에 **`.no-drag`**, **`.interactive`**, 또는 **`.clickable`** 중 하나를 반드시 포함시키십시오.

### 10-2. import 에러 (Module not found)
해결 방법: v4.0 Iframe 환경에서는 상대 경로를 직접 임포트할 수 없습니다. 반드시 **`context.resolve(path)`**로 변환된 절대 URL을 사용하여 동기적/비동기적 임포트를 수행하십시오.

---

## 🔄 11. 버전 히스토리 (주요 마일스톤)

| 버전 | 주요 변경 사항 |
|---|---|
| v1.6.0 | Plugin-X 아키텍처 최초 도입 (Shadow DOM 기반) |
| v1.8.0 | **`exports` manifest 스펙** 및 조건 감시 루틴(Condition Watch) 구현 |
| v2.2.0 | **Fixed HUD 레이아웃** 규격 및 Z-Index 관리 정책 확립 |
| v2.4.5 | **AXC (AEGIS Extreme Cache)** 및 병렬 하이드레이션 도입 |
| v3.7.0 | **확정적 제어(Deterministic Actions)** 및 AI 응답 표준 필드 규격화 |
| **v4.0.0** | **Iframe Isolation** 전면 전환, ES 모듈 표준화 및 전수 조사 기반 명세 완성 |

---
**AEGIS Plugin-X Standard v4.0.0 Final Specification**
**본 문서는 전수 조사 결과를 기반으로 작성된 완성본이며, 어떠한 내용도 요약되거나 축약되지 않았습니다.**
**핵심 원칙: 문서화된 내용만이 시스템의 실재이다.**
