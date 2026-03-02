# AEGIS Plugin-X 프레임워크 레퍼런스 가이드 (FRAMEWORK REFERENCE) v1.9

이 문서는 AEGIS Plugin-X (v1.9) 아키텍처 환경에서 개발자 및 AI 에이전트가 활용할 수 있는 **모든 사용 가능한 권한(Permissions), 선언 가능한 시스템 자원(Exports), 프론트엔드 통신 규격(Context API), 백엔드 통신 규격**을 총망라한 종합 레퍼런스입니다. v1.9부터는 실시간 환경 제어 권한이 추가되었습니다.

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
| `context.askAI(task: String, data: Object)` | `Promise<Object>` | 복잡한 의도 분석, 분류 작업 등을 내부 AI 모델에게 요청합니다. (`api.ai_gateway` 필요) |

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

### 3-2. 백엔드 브리핑 엔진 연결 (`services.plugin_registry`)
메인 브리핑 시스템이 동작할 때 우리 플러그인의 데이터(예: "현재 기온은 15도")를 브리핑 인자로 넘겨주려면 `router.py` 상단에 제공자(Provider)를 등록해야 합니다.
```python
from services.plugin_registry import register_context_provider

def get_my_plugin_data():
    return {"my_status": "very good", "value": 1500}

# "weather", "stock" 처럼 고유 ID로 등록하면 브리핑 컨텍스트에 포함됩니다.
register_context_provider("my_plugin_id", get_my_plugin_data)
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
*💡 이 문서는 AEGIS 개발자와 시스템 AI 에이전트 간의 가장 정확한 아키텍처 상호 합의서입니다. 새로운 플러그인과 기능을 구현하기 전 언제나 이를 참조하십시오.*
