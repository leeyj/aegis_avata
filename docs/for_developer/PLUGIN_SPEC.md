# AEGIS Plugin-X 규격서 (PLUGIN SPECIFICATION) v2.9.0

이 문서는 AEGIS Plugin-X 아키텍처에서 플러그인을 개발할 때 필요한 **모든 규칙, API, 스키마**의 **단일 진입점(Single Source of Truth)**입니다.

> [!TIP]
> **처음이라면** [`QUICK_START.md`](QUICK_START.md)를 먼저 보세요.
> `python create_plugin.py --id my-widget --name "나의 위젯"`으로 골격을 생성한 뒤, 이 문서를 레퍼런스로 참조하는 것이 가장 효율적입니다.

---

## §1. 아키텍처 개요

AEGIS는 **Plugin-X** 아키텍처 기반의 모듈식 AI 대시보드입니다. 핵심 원칙:

- **완전 독립 모듈화**: 각 플러그인은 `plugins/{id}/` 폴더에 자기 완결적으로 존재
- **폴더 추가/삭제만으로 기능 확장/제거** — 코어 파일 수정 불필요
- **Shadow DOM 격리**: CSS/JS 오염 물리적 차단
- **Capability Proxy**: 시스템 자원은 `context` 객체를 통해서만 접근
- **Schema-Driven AI**: 모든 AI 응답은 `display`/`briefing` JSON 구조로 강제

### 플러그인 표준 폴더 구조

```text
/plugins/{plugin-id}/
├── __init__.py               # 패키지 선언 (필수, 빈 파일)
├── manifest.json             # 메타데이터, 권한, CSP, exports (필수)
├── config.json               # 플러그인 전용 설정 (선택)
├── router.py                 # Flask Blueprint (선택)
├── {plugin_id}_service.py    # 비즈니스 로직 (선택, 명명 규칙 필수)
└── assets/
    ├── widget.html           # Shadow DOM UI 골격
    ├── widget.js             # 프론트엔드 모듈 (init/destroy)
    └── widget.css            # 스타일 (Shadow DOM 격리)
```

> ⚠️ `__init__.py`가 없으면 상대 경로 임포트(`from .xxx_service import ...`)가 동작하지 않습니다.

---

## §2. 필수 규칙 (⛔ HARD RULES)

위반 시 시스템이 깨지거나 보안 취약점이 발생하는 **절대 금지** 사항입니다.

### 2-1. 파일 및 네이밍

| # | 규칙 | 위반 시 |
|---|---|---|
| 1 | 플러그인 로직을 `/static/js/widgets/` 또는 `/services/`에 작성하지 마라 | 코어 의존성 발생, 모듈 제거 시 시스템 파괴 |
| 2 | 서비스 파일명을 `service.py`로 만들지 마라. 반드시 **`{plugin_id}_service.py`** | 네임스페이스 충돌으로 다른 플러그인 오동작 |
| 3 | `__init__.py`를 삭제하지 마라 | 상대 경로 임포트 전면 실패 |

### 2-2. 라우팅 및 보안

| # | 규칙 | 위반 시 |
|---|---|---|
| 4 | 모든 백엔드 라우트는 **`/api/plugins/{plugin-id}/...`** 패턴 필수 | `require_permission` 보안 파서가 플러그인을 식별 불가 → 403 |
| 5 | `router.py`에서 절대 경로 `import service`를 사용하지 마라. 반드시 **`from .xxx_service import`** | 글로벌 모듈 캐시 오염 |
| 6 | A 플러그인에서 B 플러그인의 파이썬 모듈을 직접 `import` 하지 마라 | 플러그인 간 종속성 발생 |

### 2-3. 프론트엔드 격리

| # | 규칙 | 위반 시 |
|---|---|---|
| 7 | `widget.js`에서 `window.xxx` 전역 변수 선언을 피하라. 반드시 `context` API만 사용 | 글로벌 오염 |
| 8 | DOM 탐색은 **`shadowRoot.querySelector()`**만 사용 (`document.getElementById` 금지) | Shadow DOM 격리 위반 |
| 9 | `widget.html`에 `<script>` 태그를 넣어도 **실행되지 않음** (innerHTML 주입 방식) | 모든 로직은 `widget.js`에 작성 |
| 10 | `<slot>` API 사용 불가 | Shadow DOM 제한 |
| 11 | 클릭 가능한 요소에 **`e.stopPropagation()`** 필수 + `mousedown`도 차단 | 위젯 드래그와 간섭 |
| 12 | 클릭 가능한 컨테이너에 **`.no-drag`** 또는 **`.interactive`** 클래스 필수 | 드래그 매니저가 이벤트 가로챔 |
| 13 | `destroy()`에서 `setInterval`, `setTimeout`, 이벤트 리스너 **반드시 해제** | 메모리 누수 |

### 2-4. 백엔드 통합

| # | 규칙 | 위반 시 |
|---|---|---|
| 14 | `register_context_provider`는 **모듈 로드 시 1회만** 호출 (라우트 핸들러 내부 금지) | 중복 등록 버그 |
| 15 | JSON 파일 I/O에 `json.load` 직접 사용 금지. 반드시 **`utils.load_json_config`** 사용 | 예외 처리 일관성 파괴 |
| 16 | `widget.js`에서 `registerCommand`에 **manifest.json의 id와 동일한 접두사** 등록 필수 | 알리아스가 핸들러를 찾지 못함 |

### 2-5. 권장 사항 (SOFT RULES)

- 전역 변수(`window.xxx`)를 사용해야 할 경우, `init()` 내부에서만 등록하고 `destroy()`에서 해제
- `config.json`은 자기 플러그인 내부에서만 참조 (타 플러그인 설정 파일 직접 읽기 금지)
- 명령어 핸들러는 `widget.js`의 export 객체 내부에 정의 (별도 JS 파일 금지)
- 개발 중 자산 수정 후 서버 재시작 또는 브라우저 캐시 삭제로 AXC 해시 갱신 필요

---

## §3. manifest.json 스키마

### 3-1. 필수 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | 플러그인 고유 ID (**폴더명과 동일**) |
| `name` | string | 사용자에게 표시되는 이름 |
| `version` | string | 시맨틱 버전 |
| `entry.html` | string | 위젯 HTML 파일 경로 |
| `entry.js` | string | 위젯 JS 모듈 경로 |

### 3-2. 선택 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `entry.css` | string | 위젯 CSS 파일 경로 |
| `entry.backend` | string | 백엔드 라우터 파일명 (예: `"router.py"`) |
| `permissions` | string[] | 시스템 권한 목록 |
| `csp_domains` | object | CSP 외부 도메인 목록 |
| `layout.default_size` | string | 기본 위젯 크기 (`size-1`, `size-1-5`, `size-2`) |
| `layout.fixed` | boolean | `true`면 Fixed HUD 모드 (위치 고정, 드래그 제외) |
| `layout.zIndex` | number | Fixed HUD의 z-index 값 |
| `hidden` | boolean | `true`면 UI 없이 백엔드만 로드 |
| `exports` | object | 스케줄러 연동용 데이터/명령어 공개 |
| `icon` | string | 사이드바 아이콘 이모지 |

### 3-3. `hidden: true` 동작

- `entry.html`, `entry.js`, `entry.css` 필드 **생략 가능** (파일도 불필요)
- `entry.backend`만 있으면 시스템이 Blueprint를 자동 등록
- 사이드바 및 대시보드 그리드에 표시되지 않음
- **사용 예시**: 데이터 폴링 서비스, 스케줄러 백엔드, 외부 API 프록시

### 3-4. `csp_domains` 규격

**프론트엔드(JS)에서 외부 URL을 fetch할 때만 필요합니다.** 백엔드(Python) `requests.get()`은 CSP와 무관합니다.

```json
"csp_domains": {
    "connect-src": ["https://api.github.com", "https://*.openapi.com"],
    "img-src": ["https://*.openweathermap.org"],
    "frame-src": ["https://www.youtube.com"]
}
```

| 키 | 용도 | 형식 규칙 |
|---|---|---|
| `connect-src` | JS `fetch()`/XHR 대상 | Scheme 포함 필수: `https://domain.com` |
| `img-src` | `<img>` 외부 이미지 | 와일드카드 지원: `https://*.example.com` |
| `frame-src` | `<iframe>` 소스 | YouTube 임베드 등 |
| `script-src` | 외부 JS CDN | **비권장** — 보안 위험 |

> ⚠️ `data:`, `blob:` URI는 AEGIS CSP에서 매우 보수적으로 다룹니다. Base64 이미지가 필요하면 백엔드에서 파일로 서비스하세요.

### 3-5. `exports` 규격 (스케줄러 조건 감시 연동)

#### `exports.sensors[]`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `id` | string | ✅ | 센서 고유 ID |
| `name` | string | ✅ | 사용자 표시 이름 (예: "실내 온도") |
| `unit` | string | ✅ | 단위 (예: "°C", "%") |
| `type` | string | ✅ | `number`, `string`, `boolean` |
| `endpoint` | string | ✅ | 데이터 조회 API 경로 |
| `field` | string | ✅ | API 응답 JSON에서 추출할 키 |

#### `exports.commands[]`

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `prefix` | string | ✅ | 명령어 접두사 (예: `/ha`) |
| `name` | string | ✅ | 명령어 설명 |
| `examples` | string[] | ❌ | 사용 예시 |

> ⛔ `exports`를 선언하지 않으면 루틴 매니저 조건 감시에 나타나지 않습니다.

### 3-6. `permissions` 전체 목록

| 권한 ID | 설명 | 사용 예시 |
|---|---|---|
| `api.google_suite` | 구글 캘린더/할일/지메일 데이터 읽기 | `calendar`, `todo`, `gmail` |
| `api.notion` | 노션 DB 쿼리/페이지 조작 | `notion` |
| `api.media_proxy` | 로컬 미디어 파일 접근 | `mp3-player` |
| `api.system_stats` | CPU/RAM 등 시스템 자원 조회 | `system-stats` |
| `api.ai_gateway` | Gemini, Grok 등 AI 프록시 통신 | `proactive-agent` |
| `api.voice_service` | TTS 및 오디오 제어 | `proactive-agent` |
| `api.io_control` | 설정 파일/스케줄 쓰기 | `scheduler` |
| `api.studio_service` | Live2D 아바타 모델 직접 접근 | `studio` |
| `ENVIRONMENT_CONTROL` | 전역 날씨 효과 (비/눈/번개) | `weather` |

### 3-7. Fixed HUD 레이아웃 (v2.2)

`layout.fixed: true` 설정 시:
1. **위치 고정**: 전역 `applyUIPositions` 대상에서 자동 제외
2. **스타일 격리**: 부모 래퍼에 전역 Glass/Blur 효과 미적용
3. **이벤트 투과**: 래퍼는 `pointer-events: none`. 인터랙션 요소에만 `pointer-events: auto` 개별 부여

---

## §4. 프론트엔드 규격

### 4-1. 위젯 라이프사이클

1. **주입**: 시스템이 `widget.html`을 fetch → `shadowRoot.innerHTML`로 삽입
2. **초기화**: `widget.js`의 `init(shadowRoot, context)`가 **1회** 호출
3. **파괴**: 위젯 제거/새로고침 시 `destroy()` 호출 → 반드시 타이머/리스너 해제

### 4-2. Context API 카탈로그

모든 시스템 자원은 `init(shadowRoot, context)`로 주입받는 **`context` 객체**를 통해서만 접근합니다.

#### 시스템 출력

| 메서드 | 반환값 | 설명 |
|---|---|---|
| `context.log(message)` | void | 콘솔에 플러그인 태그 로그 출력 |
| `context.appendLog(tag, message)` | void | 터미널 로그창에 메시지 출력 |
| `context.speak(text, audioUrl?, visualType?)` | void | TTS 음성 출력 + 말풍선 표시. 아바타 립싱크 자동 연동 |
| `context.environment.applyEffect(type)` | void | 전역 시각효과 (`RAINY`, `SNOWY`, `STORM`, `CLEAR`). `ENVIRONMENT_CONTROL` 권한 필수 |

#### 아바타 제어

| 메서드 | 반환값 | 설명 |
|---|---|---|
| `context.triggerReaction(type, data, timeout?)` | void | `"MOTION"` 또는 `"EMOTION"`. 예: `context.triggerReaction('MOTION', { alias: 'happy' })` |
| `context.playMotion(filenameOrAlias)` | void | 1회성 모션/표정 재생. 커스텀 알리아스 지원 |
| `context.changeModel(modelName)` | void | 아바타 캐릭터 실시간 교체 |

#### 입출력 및 통신

| 메서드 | 반환값 | 설명 |
|---|---|---|
| `context._t(key)` | String | i18n 번역 문자열 반환 |
| `context.applyI18n()` | void | Shadow DOM 내 `.i18n` 요소를 현재 언어로 재치환 |
| `context.registerCommand(prefix, callback)` | void | 터미널 명령어 등록. ⛔ manifest.id와 동일한 접두사 필수 |
| `context.triggerBriefing(feedbackEl, options)` | void | 전략 브리핑 실행 (선택적 위젯 필터 자동 적용) |
| `context.askAI(task, data)` | Promise\<Object\> | AI 모델에 질의. `api.ai_gateway` 필요 |
| `context.registerSchedule(name, type, callback)` | void | 글로벌 틱 스케줄러 등록 |
| `context.registerTtsIcon(type, icon)` | void | TTS 말풍선 아이콘 등록 |

#### 미디어

| 메서드 | 반환값 | 설명 |
|---|---|---|
| `context.getMediaList()` | Promise | 미디어 프록시 파일 목록 |
| `context.getAudioUrl(filename)` | String | 미디어 스트리밍 URL |

### 4-3. 명령어 등록 및 다중 파라미터 파싱

```javascript
// ⛔ manifest.id와 동일한 정규 명령어 등록 필수 (알리아스 연동)
context.registerCommand('/my-plugin', (param) => this.handleCommand(param));
```

콜백은 접두사 이후 **나머지 전체 문자열**을 `param`으로 받습니다.

| 구조 | 파싱 방법 | 예시 |
|---|---|---|
| 단일 값 | `cb(param)` 직접 사용 | `/play 음악` → `param = "음악"` |
| 서브커맨드 + 인자 | `param.split(' ', 1)` | `/obs add file.md` → `["add", "file.md"]` |
| 서브커맨드 + 나머지 | `param.split(' ', 2)` | `/obs add file.md 내용` → `["add", "file.md", "내용"]` |

### 4-4. widget.js 표준 골격

```javascript
export default {
    updateTimer: null,

    init: async function(shadowRoot, context) {
        context.log("초기화 중...");

        // 이벤트 바인딩 (⛔ stopPropagation 필수)
        const btn = shadowRoot.querySelector('#my-btn');
        if (btn) {
            btn.addEventListener('click', (e) => { e.stopPropagation(); /* ... */ });
            btn.onmousedown = (e) => e.stopPropagation();
        }

        // 명령어 등록 (⛔ manifest.id와 동일한 접두사 필수)
        context.registerCommand('/my-plugin', (cmd) => this.handleCommand(cmd));

        // 폴링 시작
        this.updateTimer = setInterval(() => this.refresh(), 300000);
    },

    handleCommand(param) { /* 반드시 이 객체 내부에 정의 */ },

    destroy: function() {
        if (this.updateTimer) clearInterval(this.updateTimer); // ⛔ 해제 필수
    }
};
```

### 4-5. 디자인 가이드 (Premium Aesthetics)

| 항목 | 규격 |
|---|---|
| **Typography** | Google Fonts (`Outfit`, `Inter`, `Roboto`) |
| **Glassmorphism** | `backdrop-filter: blur(12px)` + 반투명 배경 |
| **Micro-animations** | 호버/상태 변경 시 부드러운 `transition` |
| **Color** | 시스템 CSS 변수 (`--neon-blue`, `--neon-purple`, `--glass`, `--bg-dark`) |

### 4-6. 이벤트 전파 차단 (Interaction Safety)

```javascript
// ✅ 표준 방어 코드
item.onclick = (e) => { e.stopPropagation(); /* 로직 */ };
item.onmousedown = (e) => e.stopPropagation();
```
```html
<!-- ✅ 클릭 가능한 컨테이너에 no-drag 클래스 필수 -->
<div class="plugin-item no-drag"> ... </div>
```

---

## §5. 백엔드 규격

### 5-1. 데코레이터 레퍼런스

| 데코레이터 | import 경로 | 설명 |
|---|---|---|
| `@login_required` | `from routes.decorators import login_required` | 인증되지 않은 요청 차단 |
| `@standardized_plugin_response` | `from routes.decorators import standardized_plugin_response` | 예외 발생 시 HTML 500 대신 JSON 에러 반환: `{"status": "error", "message": "...", "type": "PluginExecutionError"}` |
| `@require_permission("...")` | `from services import require_permission` | manifest의 permissions 검증. 미등록 시 403 |

**적용 순서** (위에서 아래로 실행):
```python
@my_bp.route("/api/plugins/my-plugin/data")
@login_required                      # 1. 인증
@require_permission("api.media_proxy") # 2. 권한
@standardized_plugin_response         # 3. 예외 안전망
def get_data():
    return jsonify(MyService.get_data())
```

### 5-2. 전역 함수 레퍼런스

시스템 코어가 `window`에 노출하는 전역 객체입니다. **플러그인은 직접 호출하지 않고 `context` API를 사용하세요.**

| 전역 함수 | 시그니처 | context 대응 |
|---|---|---|
| `window.speakTTS` | `(text, audioUrl?, visualType?, speechText?)` | `context.speak()` |
| `window.CommandRouter` | `.register(prefix, cb)`, `.route(cmd, model)` | `context.registerCommand()` |
| `window.reactionEngine` | `.checkAndTrigger(type, data, timeout)` | `context.triggerReaction()` |
| `window.appendLog` | `(source, message, isDebug?)` | `context.appendLog()` |
| `window.AEGIS_AI_MODEL` | `String` (`"gemini"`, `"ollama"`) | 직접 참조 가능 (읽기 전용) |
| `window.TTS_ICONS` | `Object` (아이콘 매핑) | `context.registerTtsIcon()` |

### 5-3. 표준 유틸리티 (`utils.py`)

| 함수 | 입력 | 출력 | 설명 |
|---|---|---|---|
| `load_json_config(path)` | `str` | `dict` | 파일 부재 시 `{}` 반환, `utf-8-sig` 자동 처리 |
| `save_json_config(path, data, merge=True)` | `str`, `dict` | `bool` | 원자적 저장. `merge=True` 시 기존 데이터 보존 |
| `clean_ai_text(text)` | `str` | `str` | AI 응답의 마크다운 래퍼/태그 제거 |
| `load_settings()` | - | `dict` | `settings.json` 원본 로드 |

### 5-4. router.py 표준 골격

```python
import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required, standardized_plugin_response
from services import require_permission
from services.plugin_registry import register_context_provider
from utils import load_json_config, save_json_config
from .my_plugin_service import MyPluginService  # ⛔ 상대 경로 필수

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

my_plugin_bp = Blueprint("my_plugin", __name__)

# ⛔ 모듈 로드 시 1회만 호출 (라우트 핸들러 내부 금지)
def get_context():
    return MyPluginService.get_status()

register_context_provider("my-plugin", get_context, aliases=["나의 플러그인"])

# 설정 관리 (GET/POST 표준 패턴)
@my_plugin_bp.route("/api/plugins/my-plugin/config", methods=["GET", "POST"])
@login_required
@standardized_plugin_response
def handle_config():
    if request.method == "POST":
        data = request.json
        current = load_json_config(CONFIG_PATH)
        current.update(data)
        save_json_config(CONFIG_PATH, current)
        return jsonify({"status": "success", "config": current})
    return jsonify(load_json_config(CONFIG_PATH))
```

### 5-5. `register_context_provider` 상세

```python
register_context_provider(
    plugin_id: str,          # manifest.json의 id와 동일
    provider_func: callable, # 인자 없음, str 또는 dict 반환
    aliases: list = None     # 한글 별칭 (예: ['뉴스', '소식'])
)
```

**알리아스 동작 흐름:**
1. 백엔드: `aliases`에 등록된 별칭 → `/api/plugins/aliases` API 자동 노출
2. 프론트엔드: `CommandRouter`가 시작 시 자동 동기화
3. 사용자 입력: `/뉴스` → 시스템이 `/news`로 변환
4. 핸들러 실행: `widget.js`의 `registerCommand('/news', ...)`가 실행

> ⚠️ `widget.js`에서 `registerCommand('/news', ...)`가 없으면 알리아스가 AI 질의로 스킵됩니다.

### 5-6. 미디어 파일 서비스 패턴

`api.media_proxy` 권한으로 로컬 파일을 서비스할 때:

```python
from flask import send_from_directory

@plugin_bp.route("/api/plugins/{id}/media/stream/<filename>")
@login_required
@require_permission("api.media_proxy")
def stream_media(filename):
    # ⛔ 경로 순회 공격 방지 필수
    if ".." in filename or filename.startswith("/"):
        return jsonify({"error": "Invalid filename"}), 400
    return send_from_directory(get_media_dir(), filename)
```

> ⚠️ `send_file(path)`를 절대 경로로 직접 사용하면 경로 순회 공격에 취약합니다.

### 5-7. 장기 연결 서비스 패턴

IMAP, WebSocket 등 **요청 간 연결 유지**가 필요한 서비스:

```python
class EmailService:
    _conn = None  # 싱글턴 연결

    @classmethod
    def _get_conn(cls, host, user, password):
        try:
            if cls._conn:
                cls._conn.noop()  # ✅ 생존 확인
        except Exception:
            cls._conn = None  # 죽은 연결 폐기
        if cls._conn is None:
            cls._conn = imaplib.IMAP4_SSL(host)
            cls._conn.login(user, password)
        return cls._conn
```

| 연결 타입 | 권장 방식 | 주의 |
|---|---|---|
| IMAP (수신) | 싱글턴 + NOOP 생존 확인 | SSL 필수, 앱 비밀번호 |
| SMTP (발송) | 요청마다 연결 후 즉시 해제 | 장기 유지 불필요 |
| WebSocket | 싱글턴 + ping/pong | 재연결 백오프 권장 |
| SQLite/JSON | `utils.save_json_config` | 별도 연결 불필요 |

### 5-8. 백엔드 → 프론트엔드 폴링 아키텍처

> ⛔ `context.speak()` 등 Context API는 **프론트엔드(JS) 전용**입니다. 백엔드 Python에서 호출 불가.

```
[Python Backend]              [JS Frontend (widget.js)]
   크롤링/데이터 수집        ←── setInterval (예: 60초)
   결과를 상태 저장            ──→ /api/plugins/{id}/status
   (save_json_config)          결과 수신 후 변경 확인
                               변경 시 context.speak() ✅
```

### 5-9. 외부 HTTP 요청 규칙

| 상황 | CSP 등록 | 권한 |
|---|---|---|
| **프론트엔드** JS에서 외부 API | ✅ 필요 (`csp_domains`) | 해당 없음 |
| **백엔드** Python에서 외부 크롤링 | ❌ 불필요 | ❌ 불필요 |
| 백엔드에서 가져온 이미지를 프론트엔드 표시 | ✅ 필요 (img-src) | 해당 없음 |

---

## §6. AI 서비스 규격

### 6-1. 응답 표준 필드

| 필드 | 용도 | 특징 |
|---|---|---|
| **`display`** | 시각적 출력 | 마크다운 포함 가능. 터미널 로그에 출력 |
| **`briefing`** | 음성/말풍선 | TTS용 순수 텍스트. 마크다운 기호 금지 |
| `sentiment` | 아바타 리액션 | `happy`, `neutral`, `serious`, `alert` |
| `visual_type` | HUD 아이콘 | `weather`, `finance`, `calendar`, `system` 등 |

### 6-2. 프롬프트 탈-하드코딩

- AI 페르소나("AEGIS")를 프롬프트에 하드코딩하지 마십시오
- `prompts.json`을 통해 동적 로드
- 사용 가능 변수: `{{current_time}}`, `{{modules}}`

### 6-3. 응답 정제

백엔드 `utils.clean_ai_text()`가 자동으로:
1. 마크다운 래퍼(```json 등) 제거
2. 감정 태그/라벨 필터링
3. 익명화 규칙 적용 (`ai_filter.json`)

### 6-4. Gemini 400 에러 회피

구조화된 JSON 출력 + Search 속성 충돌 방지:
```python
# ⛔ 반드시 tools=[]를 강제 선언
response = model.generate_content(prompt, tools=[])
```

---

## §7. 스케줄러 연동

스케줄러(`plugins/scheduler`)는 시간/조건 기반 자동 실행을 담당합니다. **스케줄러 코드를 직접 수정하지 않습니다.**

### 7-1. 액션 타입 전체 목록

| 액션 | 설명 | 필수 필드 |
|---|---|---|
| `tactical_briefing` | 전체 요약 브리핑 | - |
| `widget_briefing` | 특정 위젯 브리핑 | `target` (widget id) |
| `speak` | TTS 음성 출력 | `text` |
| `reload` | 페이지 새로고침 | - |
| `yt_play` | YouTube 재생 | `target` (playlist id) |
| `yt_stop` / `yt_volume` | YouTube 정지/볼륨 | `volume` (0-100) |
| `wallpaper_set` | 배경화면 변경 | `target` (파일명) |
| **`terminal_command`** | ⭐ 범용: 터미널 명령 | `command` |
| **`api_call`** | ⭐ 범용: API 직접 호출 | `url`, `method`, `body` |

### 7-2. 플러그인에서 스케줄러 지원하는 방법

1. **`terminal_command`** (권장): `registerCommand()`로 등록한 명령어를 스케줄러 config에 추가
2. **`api_call`**: router.py에 전용 엔드포인트 구현 후 URL 등록

> ⛔ `briefing_scheduler.js`에 새로운 `case`를 하드코딩하지 마십시오.

### 7-3. 조건 감시 루틴 (Condition Watch)

시간이 아닌 **데이터 조건**으로 트리거되는 루틴입니다.

```json
{
    "condition": {
        "source": "/api/plugins/home-assist/temperature",
        "field": "temp",
        "type": "number",
        "operator": ">=",
        "value": 28
    },
    "cooldown_min": 30,
    "text": "현재 온도는 {{value}}도입니다. 기준치 {{threshold}}도를 넘었습니다."
}
```

**타입 시스템**: `type`에 따라 API 응답 값을 자동 변환합니다.

| type | 변환 | 사용 가능 연산자 |
|---|---|---|
| `number` | `parseFloat` | `>=`, `<=`, `>`, `<`, `==`, `!=` |
| `string` | 변환 없음 | `==`, `!=` |
| `boolean` | Boolean 변환 | `==`, `!=` |

**템플릿 변수**: `{{value}}` (실제 센서 값), `{{threshold}}` (기준값)

---

## §8. 시스템 내부 참고

### 8-1. 플러그인 로더 동작 원리

1. `/plugins/` 하위 모든 폴더 스캔
2. `manifest.json`의 `entry.backend` 확인
3. `importlib.util.spec_from_file_location`으로 모듈 격리 로드
4. `isinstance` 체크로 Blueprint 객체 탐색 → Flask 앱에 자동 등록

> ⚠️ 4번에서 `isinstance` → `hasattr` 순서로 수행. Flask `request` 등 LocalProxy의 `RuntimeError` 방지 목적.

### 8-2. AXC & Parallel Hydration (v2.4.5)

- **IndexedDB 캐싱**: 플러그인 자산을 SHA256 해시로 관리. 변경 없으면 **10ms 미만** 로드
- **병렬 하이드레이션**: `Promise.all` 기반. 20+ 플러그인을 동시 초기화
- **Blob URL 격리**: 번들링된 JS를 `URL.createObjectURL(blob)`로 인메모리 실행

### 8-3. 터미널 인텐트 라우팅

| 접두사 | 동작 |
|---|---|
| `#` | 확정적 웹 검색 (AI 바이패스, 구글 검색 강제) |
| `@` | 컨텍스트 주입 (해당 플러그인 상태를 AI에 주입) |
| `/` | 직접 명령 (등록된 플러그인 핸들러 실행) |
| `--m`, `--mute` | 음성 출력 음소거 |
| *(없음)* | 자유 AI 질의 (Gemini/Ollama) |

---

## §9. 자주 하는 실수 (Troubleshooting)

| 증상 | 원인 | 해결 |
|---|---|---|
| API 호출 시 403 Forbidden | `manifest.json`에 권한 미등록 또는 라우트 경로가 `/api/plugins/{id}/...` 패턴 미준수 | permissions 배열 확인, URL 패턴 수정 |
| Blueprint가 로드되지 않음 (404) | `__init__.py` 누락 또는 `entry.backend` 미설정 | 파일 존재 확인 |
| 다른 플러그인이 오동작 | 서비스 파일명 `service.py` 사용 (네임스페이스 충돌) | `{id}_service.py`로 변경 |
| 위젯 클릭 시 드래그됨 | `e.stopPropagation()` 또는 `.no-drag` 클래스 누락 | §2-3 참조 |
| 위젯 제거 후 백그라운드 동작 | `destroy()`에서 `clearInterval` 미호출 | 타이머/리스너 정리 |
| 알리아스(한글 명령) 작동 안 함 | `registerCommand`에 manifest.id 접두사 미등록 | §4-3 참조 |
| 프론트엔드 fetch 차단됨 | `csp_domains`에 도메인 미등록 | §3-4 참조 |
| AI 응답에 마크다운 래퍼 포함 | `clean_ai_text()` 미적용 | §6-3 참조 |
| Gemini 400 에러 | `tools=[]` 미선언 | §6-4 참조 |

---

**AEGIS Plugin-X Specification v2.9.0**
**이 문서는 플러그인 개발에 필요한 모든 규칙·API·스키마의 단일 진입점입니다.**

> 💡 `python create_plugin.py --help`로 보일러플레이트 생성기 옵션을 확인하세요.
