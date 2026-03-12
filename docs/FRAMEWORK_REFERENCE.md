# AEGIS Plugin-X 프레임워크 레퍼런스 가이드 (FRAMEWORK REFERENCE) v4.0.0

이 문서는 AEGIS Plugin-X (v4.0.0) 아키텍처 환경에서 개발자 및 AI 에이전트가 활용할 수 있는 모든 레퍼런스를 총망라합니다. v4.0.0에서는 **Iframe 격리 아키텍처**, **중앙 집중식 AI Schema (ai_schemas.py)**, **병렬 하이드레이션(Parallel Hydration)**이 도입되어 시스템의 안정성, 보안 및 반응 속도가 극대화되었습니다.

---

## ⚡ 0. 핵심 기술 아키텍처: AXC & Iframe Isolation

v4.0부터 도입된 아키텍처는 성능과 격리(Sandbox)를 최우선으로 합니다.

- **Iframe Isolation (v4.0)**: 모든 위젯은 독립된 Iframe 내에서 실행됩니다. 이는 레거시 Shadow DOM의 한계(Global CSS 변수 오염, JS 전역 객체 충돌 등)를 물리적으로 해결합니다.
- **AXC (AEGIS Extreme Cache)**: 모든 플러그인 자산(HTML/JS/CSS)은 브라우저 IndexedDB에 영구 저장되며, SHA256 Versioning을 통해 서버와 일치할 경우 **10ms 미만**으로 즉시 로드됩니다.
- **Two-Step Parallel Hydration**: DOM 구조(Iframe Body)를 먼저 생성한 뒤 자산을 병렬로 주입하여, 로딩 속도와 레이어 정합성을 동시에 확보합니다.

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
모든 프론트엔드 위젯(`widget.js`)은 메인 시스템의 코어를 수정하거나, 브라우저의 전역 객체(`window`)에 접근해서는 안 됩니다. 시스템 자원이 필요할 경우, `init(root, context)` 로 주입받는 **`context` (Capability Proxy) 객체**를 통해서만 통신해야 합니다. (v4.0부터는 ShadowRoot 대신 Iframe의 `document.body`인 `root`가 전달됩니다.)

> [!IMPORTANT]
> **이벤트 전파 차단 (v2.3/v4.0)**: 위젯 내부의 버튼, 체크박스 등은 반드시 `mousedown` 및 `click` 이벤트에서 `e.stopPropagation()`을 호출해야 합니다. 또한 클릭 가능한 영역(div 등)에는 `.no-drag`, `.interactive`, `.clickable` 클래스를 추가하여 시스템 드래그 매니저가 이를 무시하도록 설정하십시오.

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
| `context.applyI18n()` | `void` | 호출 시 즉각적으로 root 내부에 존재하는 `.i18n` 태그 요소들을 현재 언어로 자동 치환(리렌더링)합니다. |
| `context.resolve(path: String)` | `String` | [v4.0] 플러그인 내부 자산(JS/이미지 등)의 절대 URL을 반환합니다. ES 모듈 `import()` 시 필수적으로 사용해야 합니다. |
| `context.registerCommand(prefix: String, callback: Function)` | `void` | [Legacy] 사용자가 터미널 입력창에 특정 접두사(예: `/weather`)를 쳤을 때, `callback` 함수가 가로채서 백그라운드 작업을 실행하도록 등록합니다. v3.7.0 이후로는 백엔드 확정적 액션(`manifest.json > actions`) 사용을 권장합니다. |
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
- **`register_plugin_action(plugin_id, action_id, handler)`**: (v3.7.0) `manifest.json`에 정의된 확정적 액션을 처리할 백엔드 핸들러를 등록합니다.
- **공급자 콜백 규격**:
    - `provider_func`는 인자를 받지 않아야 합니다.
    - **반환값**: `str` (텍스트 요약) 또는 `dict` (데이터 구조). AI 엔진은 이 값을 읽어 브리핑 문장을 생성합니다.
- **다중 알리아스 지원 (v2.8+)**:
    - `aliases=['스케줄러', '루틴']` 처럼 추가 동의어를 넘기면 백엔드 API인 `/api/plugins/aliases`를 통해 프런트엔드 `CommandRouter`로 즉시 실시간 동기화됩니다.
    - **동작 효과**: 터미널에서 `일정` 또는 `/일정` 입력 시, 라우터가 이를 대상 플러그인 ID인 `/my-plugin`으로 변환하여 전달합니다.
    - 💡 **Intent Path**: `입력: @일정` ➡️ `Context 주입`, `입력: /일정` ➡️ `기능 실행`.

---

## 🛠️ 4. 데이터 서비스 및 필터링 (Data Service & Selective Context)
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

## 🤖 5. AI 서비스 및 프롬프트 규격 (AI Service Standards)
시스템의 일관된 응답과 정제를 위해 새롭게 도입된 프롬프트 아키텍처 가이드입니다.

### 5-1. 프롬프트 동기화 (`prompts.json`)
에이전트 페르소나는 더 이상 하드코딩되지 않습니다. `services/gemini_service.py`는 플러그인의 `prompts.json`을 로드하여 실행하며, 다음 변수들을 자동으로 치환합니다.
- `{{current_time}}`: 24시간 형식의 현재 서버 시간.
- `{{modules}}`: 현재 활성화된 Plugin-X 모듈들의 이름 및 설명 리스트.

### 5-2. AI 응답 정제 및 액션 동기화 (Action Sync)
백엔드는 AI 엔진의 응답을 `utils.clean_ai_text()`를 통해 가공합니다.
1. **마크다운 제거**: 마크다운 래퍼(```json, ```) 제거.
2. **태그 필터링**: 감정 태그나 라벨(`[DISPLAY]`, `AEGIS:`) 필터링.
3. **액션 태그 감지**: 응답 내 `[ACTION] SET_ALARM` 등 특수 태그가 포함된 경우 `BotManager`가 이를 해석하여 해당 플러그인의 핸들러를 실행하거나 HUD에 명령을 전달합니다.
4. **다국어 자동 지침**: `utils.get_i18n()`을 통해 사용자의 `lang` 설정에 맞춰 다국어 페르소나 지침을 주입합니다.

### 5-3. AI 응답 구조화: AI Schema (ai_schemas.py) ✨NEW
[v4.0] AI 응답의 정합성과 파싱 안정성을 위해 모든 응답을 JSON 스키마로 강제합니다. `services/ai_schemas.py`에 정의된 규격을 반드시 준수해야 합니다.

#### 5-3-1. BRIEFING_SCHEMA (전술 브리핑용)
| 필드 | 타입 | 설명 |
|---|---|---|
| `briefing` | string | 상황에 대한 5~10문장의 전문적이고 상세한 전술 보고서 (마크다운 가능) |
| `voice` | string | 사용자에게 음성으로 들려줄 2~3문장의 따뜻하고 친절한 요약 (존댓말 사용) |
| `sentiment` | enum | 현재 상황에 가장 적합한 감정 상태 (`happy`, `neutral`, `serious`, `alert`) |
| `visual_type` | enum | 강조해야 할 정보의 유형 (`weather`, `finance`, `calendar`, `email`, `none`) |

#### 5-3-2. COMMAND_SCHEMA (명령어 처리용)
| 필드 | 타입 | 설명 |
|---|---|---|
| `response` | string | 사용자에게 보여줄 응답 메시지 |
| `briefing` | string | 음성 변환용 요약 텍스트 |
| `action` | enum | 수행할 시스템 액션 (`navigate`, `toggle`, `search`, `none`) |
| `target` | string | 액션의 대상 (URL, 위젯 ID 등) |
| `sentiment` | enum | 현재 상황에 적합한 감정 상태 |

---

### 3-3. 시스템 표준 유틸리티 카탈로그 (`utils.py`)
플러그인 개발 리소스의 안정성을 위해 제공되는 핵심 유틸리티입니다.

| 메소드 | 입력 (Input) | 출력 (Output) | 설명 |
|---|---|---|---|
| `load_json_config` | `path: str` | `dict` | JSON 파일을 안전하게 로드. 부재 시 빈 딕셔너리 반환 및 에러 핸들링 완료. |
| `save_json_config` | `path: str, data: dict, merge: bool` | `bool` | 파일 쓰기. 원자적 교체(Replace) 방식으로 크래시 방지. |
| `clean_ai_text` | `text: str` | `str` | AI 응답의 마크다운 래퍼(```) 및 인덱스/라벨을 제거하여 순수 텍스트 추출. |
| `load_settings` | - | `dict` | `settings.json`의 원본 데이터를 로드. |

### 3-4. 미디어 파일 서비스 표준 (Media Serving Pattern)
`api.media_proxy` 권한으로 로컬 미디어 파일을 클라이언트에 제공하는 경우, 반드시 아래의 표준 패턴을 따라야 합니다.

**기본 미디어 디렉토리 규약:**
| 미디어 타입 | 서버 내 기본 경로 | 설명 |
|---|---|---|
| MP3 / 오디오 | `static/media/mp3/` | 음악, BGM 등의 오디오 파일 기준 경로 |
| 이미지 | `static/media/images/` | 배경 이미지 등 |

**필수 보안 패턴 (`router.py`):**
```python
from flask import send_from_directory
import os

# ✅ 반드시 경로 순회 공격을 방어해야 합니다.
@plugin_bp.route("/api/plugins/{id}/media/stream/<filename>")
@login_required
@require_permission("api.media_proxy")
def stream_media(filename):
    # ⛔ 경로 순회 공격 방지 필수
    if ".." in filename or filename.startswith("/"):
        return jsonify({"error": "Invalid filename"}), 400
    media_dir = get_media_dir()  # config.json 또는 기본 경로 반환
    return send_from_directory(media_dir, filename)
```

### 3-5. 백엔드 외부 HTTP 요청 규칙 (External HTTP from Backend)

> [!IMPORTANT]
> **`csp_domains`는 브라우저(프론트엔드) 전용입니다.** Python 백엔드에서 `requests.get()`으로 외부 URL을 호출하는 것은 CSP와 완전히 무관합니다.

| 상황 | CSP 등록 필요 여부 | 권한 필요 여부 |
|---|---|---|
| JS에서 외부 API 호출 (`fetch`) | **✅ 필요** | 해당 없음 |
| Python에서 외부 URL 크롤링 (`requests`) | **❌ 불필요** | **❌ 불필요** |
| 백엔드에서 외부 이미지를 프론트엔드에 표시 | **✅ 필요** (이미지 도메인 등록) | 해당 없음 |

```python
# ✅ 백엔드 크롤링 예제 (requests + BeautifulSoup + hashlib)
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
장기 연결 서비스는 반드시 **싱글턴 + 타임아웃 방어** 패턴으로 관리해야 합니다.

> [!WARNING]
> 재연결 로직 없이 싱글턴을 유지하면 서버 측 타임아웃 이후 에러가 발생합니다. **반드시 try/except 후 재연결 로직을 포함하십시오.**

**표준 패턴 (IMAP 예시):**
```python
class EmailService:
    _conn = None  # 싱글턴 객체

    @classmethod
    def _get_conn(cls, host, user, password):
        try:
            if cls._conn: cls._conn.noop()
        except Exception: cls._conn = None # 죽은 연결 폐기

        if cls._conn is None:
            cls._conn = imaplib.IMAP4_SSL(host)
            cls._conn.login(user, password)
        return cls._conn

    @classmethod
    def check_new_emails(cls, config: dict) -> dict:
        try:
            conn = cls._get_conn(config.get("imap_host"), config.get("email"), config.get("app_password"))
            conn.select("INBOX")
            last_uid = config.get("last_uid", "0")
            _, data = conn.uid("search", None, f"UID {last_uid}:*")
            uids = data[0].split()
            new_mails = [u for u in uids if int(u) > int(last_uid)]
            return {"new_count": len(new_mails), "uids": [u.decode() for u in new_mails]}
        except Exception as e:
            cls._conn = None # 에러 시 초기화
            return {"new_count": 0, "error": str(e)}
```

**연결 타입별 권장 패턴:**
| 연결 타입 | 권장 방식 | 주의사항 |
|---|---|---|
| IMAP (이메일 읽기) | 싱글턴 + NOOP 생존 확인 | SSL 필수, 앱 비밀번호 사용 |
| SMTP (이메일 발송) | 요청마다 연결 후 즉시 해제 | - |
| WebSocket | 싱글턴 + ping/pong 확인 | 재연결 백오프 구현 권장 |
| SQLite/JSON | `utils` 도구 사용 | - |

---

## 🔄 6. 백엔드 → 프론트엔드 통신 패턴 (Polling & Sync)

> [!IMPORTANT]
> **`context.speak()` 등 Context API는 프론트엔드 전용입니다.** 백엔드에서 직접 호출하려 하면 에러가 발생합니다. 반드시 **프론트엔드 폴링** 또는 **sync_cmd** 패턴을 사용하십시오.

### 6-1. HUD 실시간 동기화 (sync_cmd) ✨NEW
v3.7.0부터는 백엔드에서 UI 갱신 신호를 직접 보내는 방식을 권장합니다. (백엔드 핸들러 반환값에 `"sync_cmd": "refresh_ui"` 포함)

### 6-2. 표준 폴링 패턴 (Polling Architecture)
```
[Python Backend]         [JS Frontend (widget.js)]
   크롤링 실행          ←── setInterval (예: 60초마다)
   결과를 상태 저장        ──→ /api/plugins/{id}/status 호출
   (save_json_config)      결과 수신 후 변경 여부 확인
                           변경 감지 시 context.speak() 호출 ✅
```

```javascript
// ✅ widget.js: 프론트엔드 폴링 예시
const check = async () => {
    const res = await fetch('/api/plugins/{id}/status');
    const data = await res.json();
    if (data.changed) context.speak(`변경 감지: ${data.summary}`);
};
this.timer = setInterval(check, 60000);
```

---

## 🧬 7. Exports & Messaging Intelligence (BotManager) ✨UPDATED

### 7-1. 통합 명령어 기호 규격
| 기호 | 모드 (Mode) | 지능 동작 (Intelligence Behavior) |
|---|---|---|
| **`/@`** | **Hybrid** | 로컬 위젯 데이터 수집 + 외부 실시간 검색을 결합하여 종합 추론 답변. |
| **`/`** | **Local** | 외부 검색 차단. 오직 시스템 내 위젯 데이터만을 요약하여 보안/정밀 보고. |
| **`/#`** | **Search** | 시스템 데이터 없이 즉시 외부 실시간 검색만 수행. |

### 7-2. 명령어 처리 우선순위 (v3.7.0)
1. **System Core**: `/config`, `/help` 등.
2. **Deterministic Actions**: `/재생`, `/알람` 등 (AI 개입 없음).
3. **Hybrid/@**, **Local/**, **Search/#**
4. **AI Fallback**: 일반 자연어.

### 7-3. 플랫폼 독립적 어댑터 (BotAdapter)
- **추상화**: `BotAdapter` 클래스 상속을 통해 코어 수정 없이 새로운 채널 확장.
- **약한 결합**: `BotManager`는 규격화된 메시지 객체만 주고받으며 어댑터 세부를 알지 못함.

---
*💡 이 문서는 AEGIS 개발자와 시스템 AI 에이전트 간의 가장 정확한 아키텍처 상호 합의서입니다.*
