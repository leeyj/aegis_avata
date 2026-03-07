# AEGIS Plugin-X 프레임워크 레퍼런스 가이드 (FRAMEWORK REFERENCE) v2.9.0

이 문서는 AEGIS Plugin-X (v2.9.0) 아키텍처 환경에서 개발자 및 AI 에이전트가 활용할 수 있는 모든 레퍼런스를 총망라합니다. v2.4.5에서 AXC 성능 최적화 및 병렬 로딩 아키텍처가 도입되었고, v2.9.0에서 아키텍처 문서 및 시스템 안정성이 확정되었습니다.

> [!TIP]
> **빠른 시작**: 새 플러그인을 만들 때는 아래 문서를 읽기 전에 먼저 보일러플레이트 생성기를 사용하세요.  
> `python create_plugin.py --id my-widget --name "나의 위젯"` → 모든 규칙이 자동 준수된 템플릿이 생성됩니다.  
> 자세한 사항은 `create_plugin.py --help`를 참조하세요.

---

## ⚡ 0. 성능 아키텍처: AXC (AEGIS Extreme Cache)
v2.4.5부터 도입된 **AXC**는 플러그인의 부팅 속도를 극대화합니다.
- **IndexedDB**: 모든 플러그인 자산(HTML/JS/CSS)은 브라우저 IndexedDB에 영구 저장됩니다.
- **SHA256 Versioning**: 서버의 해시 값과 일치할 경우 네트워크 다운로드 없이 **10ms 미만**으로 즉시 로드됩니다.
- **Two-Step Hydration**: DOM 구조를 먼저 생성한 뒤 자산을 병렬로 주입하여, 로딩 속도와 레이어 정합성을 동시에 확보합니다.

---

## 🔐 1. Plugin-X 보안 권한 목록 (Permissions)
플러그인이 외부 환경과 통신하거나 주요 코어 시스템에 접근하려면 `manifest.json` 내 `"permissions"` 배열에 해당 권한을 등록해야 하며, 파이썬 백엔드 라우터에서는 `@require_permission("...")` 데코레이터로 보호해야 합니다. 현존하는 시스템 권한의 전체 목록은 다음과 같습니다.

| 권한 ID (Permission) | 권한 이름 | 주요 사용처 (플러그인 예시) | 설명 |
|---|---|---|---|
| `api.google_suite` | 구글 워크스페이스 | `calendar`, `todo`, `gmail` | 구글 캘린더, 할일, 지메일 등 인증된 구글 사용자의 데이터 읽기 권한 |
| `api.notion` | 노션 API 프록시 | `notion` | 사용자의 노션 토큰을 이용해 DB를 쿼리하고 페이지를 조작하는 대리 실행 권한 |
| `api.media_proxy` | 로컬 미디어 접근 | `mp3-player`, `media` | 보안 격리를 통과해 사용자의 로컬 디스크 내 미디어(MP3, 이미지) 자원을 불러올 수 있는 권한 |
| `api.system_stats` | 시스템 자원 조회 | `system-stats` | 현재 서버/PC의 CPU, 메모리, 저장공간 등 하드웨어 상태를 조회할 수 있는 시스템 모니터링 수준 권한 |
| `api.ai_gateway` | AI 외부 터널링 | `proactive-agent`, `ai` | Gemini, Grok 등 시스템에 등록된 외부 AI 제공자와 프록시 통신을 가능하게 하는 AI 제어 권한 |
| `api.voice_service` | TTS 제어 권한 | `proactive-agent`, `speaker`| 코어의 Edge-TTS 및 오디오 재생/저장 객체를 직접 통제할 수 있는 권한 |
| `api.io_control` | 입출력/설정 제어 | `scheduler` | 애플리케이션의 설정 파일(`config`), 스케줄 데이터, IO 시스템 쓰기 작업을 수행할 수 있는 권한 |
| `api.studio_service` | Live2D 코어 통제 | `studio` | 플러그인이 Live2D 아바타 모델 구성 파일, Alias 설정파일, 아바타 렌더러에 직접 접근해 강제 패치/수정하는 가장 강력한 권한 |
| `ENVIRONMENT_CONTROL` | 전역 환경 시각효과 | `weather` | 화면 전체에 비(`RAINY`), 눈(`SNOWY`), 번개(`STORM`) 등 실시간 환경 효과를 생성하고 제어할 수 있는 권한 |

---

## 🔌 2. 프론트엔드 통신 규격: Context API Catalog
모든 프론트엔드 위젯(`widget.js`)은 메인 시스템의 코어를 수정하거나, 브라우저의 전역 객체(`window`)에 접근해서는 안 됩니다. 시스템 자원이 필요할 경우, `init(shadowRoot, context)` 로 주입받는 **`context` (Capability Proxy) 객체**를 통해서만 통신해야 합니다.

> [!IMPORTANT]
> **이벤트 전파 차단 (v2.3)**: 위젯 내부의 버튼, 체크박스 등은 반드시 `mousedown` 및 `click` 이벤트에서 `e.stopPropagation()`을 호출해야 합니다. 또한 클릭 가능한 영역(div 등)에는 `.no-drag`, `.interactive`, `.clickable` 클래스를 추가하여 시스템 드래그 매니저가 이를 무시하도록 설정하십시오.

### 2-1. 시스템 상호작용 (System Output)
| 메서드 (Method Signature) | 반환값 유무 | 설명 |
|---|---|---|
| `context.log(message: String)` | `void` | 개발자 도구 콘솔에 해당 플러그인의 태그가 붙은 일관된 로그를 출력합니다. |
| `context.appendLog(tag: String, message: String)` | `void` | GUI 하단에 위치한 '공용 터미널 로그창(Terminal)'에 진행 상황이나 메시지를 출력합니다. |
| `context.speak(text: String, audioUrl?: String, visualType?: String)`| `void` | 문장을 즉시 Edge-TTS로 변환 후 스피커로 출력하며, 동시에 아바타가 입 모양(Lip-sync)을 맞춥니다. |
| `context.environment.applyEffect(type: String)` | `void` | 비(`RAINY`), 눈(`SNOWY`), 번개(`STORM`), 제거(`CLEAR`) 등 전역 시각 효과를 트리거합니다. (`ENVIRONMENT_CONTROL` 권한 필수) |

### 2-2. 아바타 제어 (Live2D Controller)
| 메서드 (Method Signature) | 반환값 유무 | 설명 |
|---|---|---|
| `context.triggerReaction(type: String, data: Object, timeout?: Number)` | `void` | 특정 조건 달성 시 아바타의 행동을 통제합니다. `"MOTION"`, `"EMOTION"` 중 선택. (예: `context.triggerReaction('MOTION', { alias: 'superhappy' })`) |
| `context.playMotion(filename_or_alias: String)` | `void` | 아바타에게 1회성 모션/표정 재생을 지시합니다. 사용자가 만든 Custom Alias(`"joy"`, `"shock"`)등도 곧바로 사용할 수 있습니다. |
| `context.changeModel(modelName: String)` | `void` | 대시보드 화면 내 아바타 캐릭터 자체를 실시간 변경/교체합니다. |

### 2-3. 입출력/언어/통신 (I/O & Net)
| 메서드 (Method Signature) | 반환값 유무 | 설명 |
|---|---|---|
| `context._t(key: String)` | `String` | 번역 시스템을 경유하여 현재 설정된 언어에 맞는 문자열을 반환합니다. |
| `context.applyI18n()` | `void` | 호출 시 즉각적으로 Shadow DOM 내부에 존재하는 `.i18n` 태그 요소들을 현재 언어로 자동 치환(리렌더링)합니다. |
| `context.registerCommand(prefix: String, callback: Function)` | `void` | 사용자가 터미널 입력창에 특정 접두사(예: `/weather`)를 쳤을 때, `callback` 함수가 가로채서 백그라운드 작업을 실행하도록 등록합니다. |
| `context.triggerBriefing(feedbackEl: Element, options: Object)` | `void` | 모든 시스템 데이터를 긁어와 AI(Gemini 등)에게 종합 전술 브리핑을 실행하도록 지시합니다. |
| `context.askAI(task: String, data: Object)` | `Promise<Object>` | 복잡한 의도 분석, 분류 작업 등을 내부 AI 모델에게 요청합니다. (`api.ai_gateway` 필요) **참고:** 유저가 타이핑한 명령어에 `--m` 옵션이 섞여있었을 경우 `ai_gateway.js` 단에서 음성 출력이 패스되는 점을 참고하십시오. |

### 2-4. `context.registerCommand` 다중 파라미터 파싱 컨벤션
콜백 함수는 `prefix` 다음에 사용자가 입력한 **나머지 전체 문자열 하나**를 `param`으로 받습니다. 서브커맨드나 인자가 여러 개일 경우, 아래 표준 파싱 컨벤션을 따르십시오.

| 구조 | 파싱 방법 | 예시 |
|---|---|---|
| 단일 값 | `cb(param)` 직접 사용 | `/play 음악` → `param = "음악"` |
| 서브커맨드 + 인자 | `param.split(' ', 1)` | `/obs add filename.md` → `["add", "filename.md"]` |
| 서브커맨드 + 나머지 전체 | `param.split(' ', 2)` | `/obs add daily.md 오늘 회의` → `["add", "daily.md", "오늘 회의"]` |

```javascript
// ✅ 다중 파라미터 파싱 표준 코드
context.registerCommand('/obs', (param) => {
    const parts = param.trim().split(' ');
    const sub = parts[0];                            // 서브커맨드: "add", "read" 등
    const rest = param.slice(sub.length).trim();     // 나머지 전체 문자열

    if (sub === 'add') {
        const spaceIdx = rest.indexOf(' ');
        const filename = rest.slice(0, spaceIdx);    // "daily.md"
        const content  = rest.slice(spaceIdx + 1);  // "오늘 회의 정리..."
        // → 백엔드 POST 요청
    } else if (sub === 'read') {
        // rest = "filename.md" (단일 인자)
    } else {
        context.appendLog('OBS', `알 수 없는 명령: ${sub}. /obs add [파일명] [내용] 형식으로 사용`);
    }
});
```

---

## 📡 3. 백엔드 통신 규격 (Backend Standards)
각 플러그인의 백엔드 구조 파일(`router.py`, `xxx_service.py`)은 다음의 규칙을 따라야 시스템 파서가 읽고 실행할 수 있습니다.

### 3-0-1. 시스템 전역 함수 레퍼런스 (Global Functions)
시스템 코어가 `window`에 노출하는 전역 함수/객체입니다. 플러그인 개발자는 이를 직접 호출하지 않고 **`context` API를 통해 접근**하는 것이 원칙이나, 동작 원리를 이해하기 위해 규격을 명시합니다.

| 전역 객체/함수 | 시그니처 | 설명 | 플러그인에서의 올바른 접근법 |
|---|---|---|---|
| `window.speakTTS` | `speakTTS(text: String, audioUrl?: String, visualType?: String, speechText?: String)` | 시스템 내 유일한 음성출력 엔드포인트. `text`=말풍선 표시용, `audioUrl`=미리 생성된 음성 파일 URL(없으면 자동 TTS), `visualType`=아이콘 타입(`'system'`, `'weather'` 등), `speechText`=TTS 엔진에 전달할 순수 텍스트(마크다운 제거 후) | `context.speak(display, briefing, visualType)` |
| `window.CommandRouter` | `.init()`, `.register(prefix, callback)`, `.route(command, model)` | 터미널 입력 라우팅 허브. `register()`로 명령어 등록, `route()`로 명령 디스패치. 알리아스 자동 동기화 내장 | `context.registerCommand(prefix, callback)` |
| `window.reactionEngine` | `.checkAndTrigger(type: String, data: Object, timeout: Number)` | 아바타 리액션(모션/감정) 트리거 엔진. `type`=`'MOTION'`/`'EMOTION'`, `data`=`{alias:'happy'}` 또는 `{file:'경로'}` | `context.triggerReaction(type, data, timeout)` |
| `window.appendLog` | `appendLog(source: String, message: String, isDebug?: Boolean)` | 터미널 로그창에 메시지 출력. `source`=태그명, `isDebug`=`true`이면 디버그 모드일 때만 표시 | `context.appendLog(tag, message)` |
| `window.AEGIS_AI_MODEL` | `String` (`"gemini"`, `"ollama"` 등) | 현재 선택된 AI 모델명. 터미널의 모델 셀렉터에서 변경됨 | 직접 참조 가능 (읽기 전용) |
| `window.AEGIS_HUD` | `.showBubble(text, icon)`, `.hideBubble()` | TTS 말풍선 HUD 컨트롤러 | 직접 사용하지 않음 (TTS 엔진이 내부 호출) |
| `window.TTS_ICONS` | `Object` (`{ 'system': '⚙️', 'weather': '🌤️', ... }`) | 말풍선 아이콘 매핑 테이블 | `context.registerTtsIcon(type, icon)` |

> [!IMPORTANT]
> **플러그인은 위 전역 함수를 직접 호출하지 마세요.** `context` API가 내부적으로 이 함수들을 안전하게 래핑합니다. 전역 함수의 시그니처가 변경되어도 `context` API는 하위 호환성을 보장합니다.

### 3-0-2. 백엔드 표준 데코레이터 레퍼런스

| 데코레이터 | import 경로 | 설명 |
|---|---|---|
| `@login_required` | `from routes.decorators import login_required` | 인증되지 않은 요청 차단 (세션/토큰 검증) |
| `@standardized_plugin_response` | `from routes.decorators import standardized_plugin_response` | **플러그인 전용 예외 안전망.** 라우트 함수 실행 중 예외가 발생하면 HTML 500 에러 대신 표준 JSON 에러(`{"status": "error", "message": "...", "type": "PluginExecutionError"}`)를 반환하여 프론트엔드 크래시를 방지합니다. |
| `@require_permission("...")` | `from services import require_permission` | `manifest.json`의 `permissions` 배열에 해당 권한이 등록되었는지 검증. 미등록 시 403 반환 |

```python
# ✅ 올바른 데코레이터 적용 순서 (위에서 아래로 실행)
@my_plugin_bp.route("/api/plugins/my-plugin/data")
@login_required                      # 1. 인증 검증
@require_permission("api.media_proxy") # 2. 권한 검증
@standardized_plugin_response         # 3. 예외 안전망 (가장 바깥쪽에서 감쌈)
def get_data():
    return jsonify(MyService.get_data())
```

### 3-1. 라우트명명 표준 (Endpoint Isolation)
**절대 규칙:** 모든 플러그인에서 작성하는 Flask Blueprint의 `@app.route()`는 무조건 `/api/plugins/{자신의_plugin_id}/...` 형태의 경로를 접두어로 시작해야 합니다.
이를 지키지 않으면 `require_permission` 데코레이터를 통과할 수 없어 접속이 차단(403)됩니다.
```python
# ✅ 올바른 표준
@my_plugin_bp.route("/api/plugins/notion/search") 

# ❌ 금지 병목 (다른 앱과 충돌, 보안 파서 우회)
@my_plugin_bp.route("/api/notion/search") 
```

### 3-2. 백엔드 브리핑 엔진 + 다중 알리아스 연동 (`services.plugin_registry`)
사용자가 AI 브리핑을 요청할 때 플러그인의 현황 데이터를 포함시키려면 반드시 공급자(Provider)를 등록해야 합니다.

> ⛔ **주의 (위치 및 타이밍)**: `register_context_provider`는 각 요청(Request) 단위가 아닌, **파이썬 모듈이 최초로 로드될 때 단 1회만 호출**되어야 합니다. 즉, 백엔드 로직 최상단 모듈(Module-level)이나 서비스 클래스의 초기화 과정에서 한 번만 등록하십시오.

- **함수 시그니처**: `register_context_provider(plugin_id: str, provider_func: callable, aliases: list = None)`
- **공급자 콜백 규격**:
    - `provider_func`는 인자를 받지 않아야 합니다.
    - **반환값**: `str` (텍스트 요약) 또는 `dict` (데이터 구조). AI 엔진은 이 값을 읽어 브리핑 문장을 생성합니다.
- **다중 알리아스 지원 (v2.8+)**:
    - `aliases=['스케줄러', '루틴']` 처럼 추가 동의어를 넘기면 백엔드 API인 `/api/plugins/aliases`를 통해 프론트엔드 `CommandRouter`로 즉시 실시간 동기화됩니다.
    - **라우팅 규칙**: 터미널에서 `일정` 또는 `/일정` 입력 시, 라우터가 이를 대상 플러그인 ID인 `/my-plugin`으로 변환하여 전달합니다.
    - **필수 조건**: 변환된 명령어를 처리하기 위해 `widget.js` 내에 `context.registerCommand('/my-plugin', callback)`이 반드시 존재해야 합니다.
    - 💡 **Intent Path**: `입력: @일정` ➡️ `Context 주입`, `입력: /일정` ➡️ `기능 실행`.

---

## 🛠️ 4. 데이터 서비스 및 필터링 (Data Service & Selective Context) ✨NEW

브리핑 성능 최적화를 위한 백엔드 데이터 필터링 규격입니다.

### 4-1. `DataService.collect_all_context` (Python)
- **Signature**: `collect_all_context(plugin_ids: list = None) -> dict`
- **설명**: 현재 활성화된 모든 플러그인의 데이터를 수집합니다. `plugin_ids`를 넘기면 해당 ID를 가진 플러그인의 데이터만 선별적으로 수집합니다. 브리핑 엔진에서 사용자가 선택한 위젯만 분석할 때 사용됩니다.

### 4-2. 설정 관리 표준 API 패턴 (Config Persistence)
모든 플러그인은 사용자가 위젯 내에서 설정을 변경할 수 있도록 다음 라우트 구현을 권장합니다.

```python
# router.py 예시
@plugin_bp.route("/api/plugins/{id}/config", methods=["GET", "POST"])
@login_required
@standardized_plugin_response
def handle_config():
    if request.method == "POST":
        data = request.json  # UI에서 보낸 설정 객체
        current = load_json_config(CONFIG_PATH)
        current.update(data)
        save_json_config(CONFIG_PATH, current)
        return jsonify({"status": "success", "config": current})
    return jsonify(load_json_config(CONFIG_PATH))
```

---

## 🤖 5. AI 서비스 및 프롬프트 규격 (AI Service Standards) ✨NEW

시스템의 일관된 응답과 정제를 위해 새롭게 도입된 프롬프트 아키텍처 가이드입니다.

### 4-1. 프롬프트 동기화 (`prompts.json`)
에이전트 페르소나는 더 이상 하드코딩되지 않습니다. `services/gemini_service.py`는 플러그인의 `prompts.json`을 로드하여 실행하며, 다음 변수들을 자동으로 치환합니다.
- `{{current_time}}`: 24시간 형식의 현재 서버 시간.
- `{{modules}}`: 현재 활성화된 Plugin-X 모듈들의 이름 및 설명 리스트.

### 4-2. AI 응답 정제 알고리즘
백엔드는 AI 엔진의 응답을 `utils.clean_ai_text()`를 통해 가공합니다.
1. 마크다운 래퍼(```json, ```) 제거
2. 감정 태그/라벨(`[DISPLAY]`, `AEGIS:`) 필터링
3. 익명화 규칙 적용 (`ai_filter.json`)
이를 통해 프론트엔드는 항상 정제된 순수 텍스트/데이터만 수신하게 됩니다.

### 3-3. 시스템 표준 유틸리티 카탈로그 (`utils.py`)
플러그인 개발 리소스의 안정성을 위해 제공되는 핵심 유틸리티입니다.

| 메소드 | 입력 (Input) | 출력 (Output) | 설명 |
|---|---|---|---|
| `load_json_config` | `path: str` | `dict` | JSON 파일을 안전하게 로드. 부재 시 빈 딕셔너리 반환 및 에러 핸들링 완료. |
| `save_json_config` | `path: str, data: dict, merge: bool` | `bool` | 파일 쓰기. 원자적 교체(Replace) 방식으로 크래시 방지. |
| `clean_ai_text` | `text: str` | `str` | AI 응답의 마크다운 래퍼(```) 및 인덱스/라벨을 제거하여 순수 텍스트 추출. |
| `load_settings` | - | `dict` | `settings.json`의 원본 데이터를 로드. |

### 3-4. 미디어 파일 서비스 표준 (Media Serving Pattern)
`api.media_proxy` 권한으로 로컬 미디어 파일을 클라이언트에 제공하는 경우, 반드시 아래의 표준 패턴을 따라야 합니다. 경로 임의 지정은 기존 플러그인과 파일 충돌을 야기합니다.

**기본 미디어 디렉토리 규약:**
| 미디어 타입 | 서버 내 기본 경로 | 설명 |
|---|---|---|
| MP3 / 오디오 | `static/media/mp3/` | 음악, BGM 등의 오디오 파일 기준 경로 |
| 이미지 | `static/media/images/` | 배경 이미지 등 |
| 사용자 지정 | `config.json`의 `media_directory` 필드 | 오버라이드 시 절대 경로 지정 |

**필수 보안 패턴 (`router.py`):**
```python
from flask import send_from_directory
import os

# ✅ 반드시 경로 순회 공격을 방어해야 합니다.
@plugin_bp.route("/api/plugins/{id}/media/stream/<filename>")
@login_required
@require_permission("api.media_proxy")
def stream_media(filename):
    # ⛔ 경로 순회 공격 방지 필수 (이 검사 없이 배포하지 마십시오)
    if ".." in filename or filename.startswith("/"):
        return jsonify({"error": "Invalid filename"}), 400
    media_dir = get_media_dir()  # config.json 또는 기본 경로 반환
    return send_from_directory(media_dir, filename)

# ✅ 파일 목록 조회 표준 패턴
@plugin_bp.route("/api/plugins/{id}/media/list")
@login_required
@require_permission("api.media_proxy")
def list_media():
    media_dir = get_media_dir()
    files = [f for f in os.listdir(media_dir) if f.endswith(".mp3")] if os.path.exists(media_dir) else []
    return jsonify(files)
```

> [!WARNING]
> `send_file(path)`를 절대 경로로 직접 사용하는 것은 **경로 순회 공격에 취약**합니다. 반드시 `send_from_directory(directory, filename)` 를 사용하고 파일명을 검증하십시오.

### 3-5. 백엔드 외부 HTTP 요청 규칙 (External HTTP from Backend)

> [!IMPORTANT]
> **`csp_domains`는 브라우저(프론트엔드) 전용입니다.** Python 백엔드(`router.py`, `*_service.py`)에서 `requests.get()`으로 외부 URL을 호출하는 것은 AEGIS 권한 시스템 및 CSP와 완전히 무관합니다. 백엔드 크롤링, 외부 API 호출은 별도 권한 없이 자유롭게 수행할 수 있습니다.

| 상황 | CSP 등록 필요 여부 | 권한 필요 여부 |
|---|---|---|
| 프론트엔드(JS)에서 외부 API 호출 (`fetch`) | **✅ 필요** (`csp_domains`에 등록) | 해당 없음 |
| 백엔드(Python)에서 외부 URL 크롤링 (`requests`) | **❌ 불필요** | **❌ 불필요** |
| 백엔드에서 외부 이미지를 프론트엔드에 표시 | **✅ 필요** (이미지 도메인 등록) | 해당 없음 |

```python
# ✅ 백엔드 크롤링 - 권한/CSP 등록 불필요, 표준 라이브러리 자유 사용
import requests
from bs4 import BeautifulSoup
import hashlib

def crawl_and_check(url: str, last_hash: str) -> dict:
    try:
        res = requests.get(url, timeout=10)
        soup = BeautifulSoup(res.text, 'html.parser')
        content = soup.get_text()
        new_hash = hashlib.md5(content.encode()).hexdigest()
        return {"changed": new_hash != last_hash, "hash": new_hash}
    except Exception as e:
        return {"changed": False, "hash": last_hash, "error": str(e)}
```

### 3-6. 장기 연결 서비스 패턴 (Persistent Connection Services)

IMAP, SMTP, WebSocket, DB 커넥션처럼 **요청 간 연결을 유지해야 하는 서비스**는 일반적인 크롤링 패턴(`§3-5`)과 다르게 구현해야 합니다. 반드시 `*_service.py` 클래스 내에서 **싱글턴 + 타임아웃 방어** 패턴으로 관리해야 합니다.

> [!WARNING]
> 싱글턴 연결을 재연결 로직 없이 유지하면, 서버 측 타임아웃(일반적으로 30분) 이후 연결이 끊겼는데도 알지 못하고 에러가 발생합니다. **반드시 `try/except` 후 재연결 로직을 포함**하십시오.

**표준 패턴 (IMAP 예시):**
```python
import imaplib
import email
from utils import load_json_config, save_json_config

class EmailService:
    _conn = None  # 싱글턴 연결 객체

    @classmethod
    def _get_conn(cls, host, user, password):
        """연결 반환. 끊어진 경우 자동 재연결."""
        try:
            # ✅ 타임아웃 감지: NOOP 명령으로 연결 생존 여부 확인
            if cls._conn:
                cls._conn.noop()
        except Exception:
            cls._conn = None  # 죽은 연결 폐기

        if cls._conn is None:
            # ✅ 신규 연결 수립 (SSL 필수)
            cls._conn = imaplib.IMAP4_SSL(host)
            cls._conn.login(user, password)
        return cls._conn

    @classmethod
    def check_new_emails(cls, config: dict) -> dict:
        """새 메일 확인 후 상태 반환."""
        try:
            conn = cls._get_conn(
                config.get("imap_host"),
                config.get("email"),
                config.get("app_password")  # Gmail 앱 비밀번호 or OAuth2 토큰
            )
            conn.select("INBOX")
            # UID 기반으로 마지막 확인 이후의 새 메일만 조회
            last_uid = config.get("last_uid", "0")
            _, data = conn.uid("search", None, f"UID {last_uid}:*")
            uids = data[0].split()
            new_mails = [u for u in uids if int(u) > int(last_uid)]
            return {"new_count": len(new_mails), "uids": [u.decode() for u in new_mails]}
        except Exception as e:
            cls._conn = None  # ✅ 에러 시 반드시 연결 초기화
            return {"new_count": 0, "error": str(e)}
```

**연결 타입별 권장 패턴:**
| 연결 타입 | 권장 방식 | 주의사항 |
|---|---|---|
| IMAP (이메일 읽기) | 싱글턴 + NOOP으로 생존 확인 | SSL 필수, 앱 비밀번호 사용 |
| SMTP (이메일 발송) | 요청마다 연결 후 즉시 해제 | 장기 유지 불필요 |
| WebSocket | 싱글턴 + `ping/pong` 생존 확인 | 재연결 백오프 구현 권장 |
| SQLite/JSON | `utils.save_json_config` 사용 | 별도 연결 불필요 |

---

## 🔄 5. 백엔드 → 프론트엔드 통신 패턴 (Polling Architecture)

> [!IMPORTANT]
> **`context.speak()` 등 Context API는 프론트엔드(JavaScript) 전용입니다.** 백엔드(Python)에서 직접 호출하려 하면 즉시 에러가 발생합니다. 백엔드에서 발생한 이벤트(예: 새 콘텐츠 감지)를 사용자에게 알리려면 반드시 **프론트엔드 폴링(Polling)** 패턴을 사용해야 합니다.

### 표준 폴링 패턴 (올바른 방법)
```
[Python Backend]         [JS Frontend (widget.js)]
   크롤링 실행          ←── setInterval (예: 60초마다)
   결과를 상태 저장        ──→ /api/plugins/{id}/status 호출
   (save_json_config)      결과 수신 후 변경 여부 확인
                           변경 감지 시 context.speak() 호출 ✅
```

```python
# ✅ router.py: 백엔드는 상태만 관리하고 반환
@plugin_bp.route("/api/plugins/{id}/status")
@login_required
def get_status():
    status = load_json_config(STATUS_PATH)
    return jsonify(status)  # {"changed": true, "summary": "새 공지: ..."}
```

```javascript
// ✅ widget.js: 프론트엔드가 폴링하여 변경 감지 후 알림
const check = async () => {
    const res = await fetch('/api/plugins/{id}/status');
    const data = await res.json();
    if (data.changed) {
        context.speak(`새로운 내용이 감지되었습니다: ${data.summary}`);
        context.triggerReaction('MOTION', { alias: 'alert' });
    }
};
this.timer = setInterval(check, 60000); // 60초마다 폴링
```

```python
# ❌ 절대 금지: 백엔드에서 context.speak() 직접 호출 시도
# context.speak("새 내용 발견!")  → NameError: context is not defined
```

---

## 🧬 4. Exports 선언 규격 (Condition Watch)
스케줄러와 제3자 프로그램이 해당 위젯이 추출해 낸 센서 수치를 시간별로 관제하고 상호작용할 수 있도록 `manifest.json` 내 `exports` 항목에 인터페이스를 선언해야 합니다.

### 4-1. `exports.sensors` 배열 모델
센서는 플러그인이 모은 데이터 중 "임계값 도달 시 경고/반응" 할 기준을 만들어 주기 위해 존재합니다.
| 파라미터명 | 타입 | 설명 | 예제값 |
|---|---|---|---|
| `id` | String | 센서의 고유키값 | `"indoor_temp"` |
| `name` | String | 사용자에게 표시할 한국어 친화명칭 | `"실내 온도 측정"` |
| `unit` | String | 데이터의 단위 표기 | `"°C"`, `"%"` |
| `type` | String | 반환되는 데이터의 원시 타입 (비교 연산용) | `"number"`, `"string"`, `"boolean"` |
| `endpoint` | String | 스케줄러가 데몬으로 찔러볼 API 주소 | `"/api/plugins/my-plugin/data"` |
| `field` | String | `endpoint`가 반환한 JSON 중 스케줄러가 파싱할 Key | `"main_temperature"` |

### 4-2. `exports.commands` 배열 모델
UI 없이 해당 플러그인을 터미널/콘솔로 100% 핸들링할 수 있도록 제공되는 명령어 가이드라인을 시스템 에디터 드롭다운에 추가합니다.
| 파라미터명 | 타입 | 설명 | 예제값 |
|---|---|---|---|
| `prefix` | String | 사용자가 입력할 명령어 트리거 키워드 | `"/ns"` |
| `name` | String | 명령어에 대한 한 줄 설명 | `"노션 워크스페이스 제어"` |
| `examples` | [String] | (선택적) 올바른 사용 예시 | `["/ns clean", "/ns switch @업무"]` |

---

## 🚀 6. 보일러플레이트 생성기 (`create_plugin.py`)

위의 모든 규칙을 수동으로 지키기 어렵다면, 프로젝트 루트의 `create_plugin.py`를 사용하여 규격에 맞는 플러그인 골격을 자동 생성할 수 있습니다.

```bash
# 기본 플러그인 생성 (백엔드 + 프론트엔드)
python create_plugin.py --id my-widget --name "나의 위젯"

# 권한과 CSP 도메인을 함께 지정
python create_plugin.py --id stock-alert --name "주식 알림" \
    --permissions api.ai_gateway \
    --csp-domains "https://api.example.com"

# UI 없는 백그라운드 서비스
python create_plugin.py --id bg-worker --name "백그라운드 워커" --hidden
```

**자동으로 적용되는 규칙 (~20개):** 폴더 구조, `__init__.py`, manifest.json 필수 필드, 라우트 패턴, 서비스 네이밍, 상대 경로 임포트, `register_context_provider` 호출 위치, `standardized_plugin_response` 데코레이터, `context` API 사용, `shadowRoot` DOM 접근, `registerCommand` 연동, `e.stopPropagation()`, `destroy()` 정리, Google Fonts, glassmorphism 디자인 등.

---
*💡 이 문서는 AEGIS 개발자와 시스템 AI 에이전트 간의 가장 정확한 아키텍처 상호 합의서입니다. 새로운 플러그인과 기능을 구현하기 전 먼저 `create_plugin.py`로 골격을 생성한 뒤, 이 문서를 참조하여 세부 사항을 확인하십시오.*
