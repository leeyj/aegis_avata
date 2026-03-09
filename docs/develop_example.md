# AEGIS Plugin-X: 홈 어시스트 개발 실전 사례 (v2.2)

본 문서는 **TinyTuya 기반 에어컨 제어 시스템**을 AEGIS의 차세대 아키텍처인 **Plugin-X**로 이관하면서 논의된 핵심 설계 철학과 기술적 구현 사례를 상세히 기록합니다.

---

## 🎨 0. 시스템 구성도 (Visual Concept)

> [!NOTE]
> **[그림 1: AEGIS Plugin-X 통합 아키텍처 다이어그램]**
> - 좌측: 독립된 Plugin 폴더 (Manifest, Assets, Router)
> - 중앙: AEGIS Core (Modular Loader, Modular Scheduler, Security, Capability Proxy)
> - 우측: 서비스 레이어 (Routine Manager, AI Engine, TTS)
> - 하단: IoT 하드웨어 (TinyTuya Hub, AC)

---

## 🏗️ 1. 개발 변천사 (AS-IS vs TO-BE)

### 1-0. 원본 스크립트 (AS-IS: 단일 절차형 구조)
통합 전에는 다음과 같이 루프 기반으로 동작하며 시스템 리소스를 독점하던 형태였습니다.

```python
import tinytuya
import time
import json

# --- 장치 설정 (개인정보 보호를 위해 치환됨) ---
HUB_ID = 'YOUR_HUB_ID'
HUB_KEY = 'YOUR_HUB_KEY'
HUB_IP = '192.168.0.XXX'
AC_ID = 'YOUR_AC_ID'

hub = tinytuya.Device(HUB_ID, HUB_IP, HUB_KEY)
hub.set_version(3.3)

def set_ac_all_in_one(power=True, temp=24, mode=1, wind=1):
    command_list = [
        {"code": "PowerOn" if power else "PowerOff", "value": "PowerOn" if power else "PowerOff"},
        {"code": "T", "value": int(temp)},
        {"code": "M", "value": int(mode)},
        {"code": "F", "value": int(wind)}
    ]
    dps_data = {'201': json.dumps(command_list)}
    payload = {'protocol': 5, 't': int(time.time()), 'data': dps_data, 'devId': HUB_ID, 'cid': AC_ID}
    return hub.send(payload)

def run_aegis_final():
    while True:
        try:
            status = hub.status()
            if 'dps' in status:
                temp = status['dps']['101'] / 10.0
                print(f"[*] 현재 온도: {temp}°C")
                # ... 자동 제어 로직 ...
            time.sleep(10) # 10초 대기 (Blocking)
        except Exception as e: break
```

### 1-1. AEGIS 통합 구조 (TO-BE: Plugin-X 아키텍처)
위의 절차형 코드를 아래와 같이 역할별로 분산 배치하여 시스템 유연성을 확보했습니다.

- **Backend (`climate_service.py`)**: 비즈니스 로직(TinyTuya 통신) 클래스화 및 **표준 유틸리티** 활용.
- **Router (`router.py`)**: 표준 API 엔드포인트 지정 및 **브리핑 엔진(Registry)** 연동.
- **Frontend (`widget.js`)**: Shadow DOM 기반 UI 인터랙션 및 상태 갱신.
- **Automation (`manifest.json`)**: 루틴 엔진에 센서 데이터 주권 위임.

---

## 🛠️ 2. 핵심 API 및 도메인 지식 가이드 (Critical for Handover)

타 AI가 작업을 인계받을 때 발생할 수 있는 '추측'에 의한 오류를 방지하기 위한 표준 규격입니다.

### 2-1. 시스템 표준 유틸리티 (`utils.py`)
플러그인은 개별적인 `json.load` 대신 반드시 시스템 표준 유틸리티를 사용하여 파일 잠금 및 예외 처리를 일관되게 수행해야 합니다.

| 함수명 | 파라미터 | 반환값 | 특징 |
|---|---|---|---|
| `load_json_config(path)` | `path`: 파일 절대경로 | `dict` | 파일 부재 시 `{}` 반환, `utf-8-sig` 지원 |
| `save_json_config(path, data)` | `path`: 경로, `data`: 저장할 객체 | `bool` | 원자적 저장(Atomic Write) 수행 |

### 2-2. 브리핑 엔진 연동 (`services.plugin_registry`)
사용자가 "뉴스 브리핑해줘"라고 할 때 플러그인 데이터를 포함시키려면 `register_context_provider`를 호출해야 합니다.

- **규격**: `register_context_provider(plugin_id: str, provider_func: callable, aliases: list = None)`
- **동작**: `provider_func`는 인자가 없으며 **문자열(String)** 또는 **딕셔너리(Dict)**를 반환합니다. `aliases`를 통해 등록된 별칭(예: '에어컨', '온도')은 터미널에서 즉시 사용 가능합니다.
- **예시**: `register_context_provider("climate-control", get_climate, aliases=["에어컨", "실내온도"])`

### 2-3. TinyTuya 도메인 특수 지식 (DPS Protocol)
이 플러그인의 핵심은 하드웨어 규격 준수입니다. AI가 임의로 수정해서는 안 되는 부분입니다.

- **DPS ID `201`**: 에어컨 통합 제어 채널입니다.
- **데이터 형식**: 반드시 `[{"code": "Power...", "value": "..."}]` 형태의 **리스트 객체를 JSON 문자열**로 변환하여 주입해야 합니다. (`json.dumps` 필수)

---

## 🏗️ 3. 왜 "모듈형 플러그인" 방식인가? (철학적 배경)

기존의 단일 파이썬 스크립트(`while True` 루프 기반)를 위젯화하면서 논의된 핵심 강점입니다.

### 1-1. Non-blocking & Event-driven
- **과거**: 에어컨 온도를 체크하는 동안 시스템의 다른 기능(음악 재생, AI 대화)이 멈추거나 지연될 위험이 있었습니다.
- **현재**: 백엔드는 Flask Blueprint로, 프론트엔드는 Shadow DOM 내 JS 모듈로 동작합니다. 시스템 전체를 점유하지 않고 이벤트가 발생할 때만 호출되어 자원 효율성을 극대화합니다.

### 1-2. 메인 환경 보호 (Zero-Touch Core)
- **강점**: `app_factory.py`나 `index.html` 같은 핵심 코드를 한 줄도 수정하지 않습니다. 
- **원리**: `/plugins` 폴더에 새 폴더를 넣는 순간, 시스템 로더가 `manifest.json`을 읽고 자동으로 라우팅과 UI를 생성합니다. 이는 다른 AI가 작업을 이어받더라도 메인 시스템을 파괴할 위험을 원천 차단합니다.

---

## 🧩 2. 실제 구현: 트리거 등록 및 액션 (Step-by-Step)

### 2-1. 데이터 노출 (Manifest.json)
플러그인이 자신의 데이터를 시스템에 어떻게 알리는지가 핵심입니다. `exports.sensors` 규격을 통해 루틴 매니저가 이 데이터를 "인간이 읽을 수 있는 이름"으로 인식하게 합니다.

```json
"exports": {
    "sensors": [
        {
            "id": "indoor_temp",
            "name": "실내 온도",
            "unit": "°C",
            "type": "number",
            "endpoint": "/api/plugins/climate-control/status",
            "field": "temp"
        }
    ]
}
```

> [!TIP]
> **[그림 2: 루틴 매니저 GUI 시뮬레이션 화면]**
> - 사용자가 '조건 감시' 선택 시 드롭다운에 "🌡️ 실내 온도 (에어컨 통합 제어)"가 자동으로 나타나는 모습.
> - 사용자는 API URL이나 JSON 구조를 몰라도 자연어로 조건을 설정할 수 있음.

### 2-2. 백엔드 서비스 (climate_service.py)
제공된 `tinytuya` 로직을 캡슐화하여, 특정 조건 시 전원/온도/모드를 통합 제어하는 `set_ac` 함수를 구현했습니다.

```python
def set_ac(self, power=True, temp=24, mode=1, wind=1):
    # 201번 DPS에 All-in-One 명령 주입 로직
    command_list = [
        {"code": "PowerOn" if power else "PowerOff", "value": "PowerOn" if power else "PowerOff"},
        {"code": "T", "value": int(temp)},
        {"code": "M", "value": int(mode)},
        {"code": "F", "value": int(wind)}
    ]
    # payload 전송...

# 2-4. 프론트엔드 명령어 수신 (widget.js)
기능의 완전한 통합을 위해 자신의 ID와 일치하는 정규 명령어를 반드시 등록해야 합니다.

```javascript
// [v2.8] 터미널 알리아스(/에어컨) 연동을 위한 정규 명령어 등록 필수
context.registerCommand('/climate-control', (cmd) => this.handleCommand(cmd));
context.registerCommand('/ac', (cmd) => this.handleCommand(cmd));
```


### 2-3. 리터럴 액션 (Routine Trigger)
실제 구동 시 루틴 매니저는 다음과 같은 논리로 동작합니다.

1.  **감시 (Poll)**: 루틴 엔진이 1분마다 `endpoint`를 호출.
2.  **비교 (Evaluate)**: 응답 받은 `temp` 값이 사용자가 정한 `threshold`(예: 22도) 이하인지 판별.
3.  **실행 (Execute)**: 조건 충족 시 `action: "api_call"`을 통해 `/api/plugins/climate-control/control` 호출.

---

## 🛡️ 3. 보안 및 격리 (Shadow DOM)

위젯의 UI는 **Shadow DOM** 내부에 격리됩니다. 이는 에어컨 위젯의 CSS가 유튜브 뮤직이나 시계 위젯의 디자인을 망가뜨리지 않도록 보장합니다.

> [!IMPORTANT]
> **[그림 3: Shadow DOM 격리 구조도]**
> - `#climate-widget`이 별도의 Shadow Root 하위에 캡슐화되어 전역 CSS와 분리된 모습.

---

## 💡 종합 평가: AI 인계 시 결과물 차이
- **질문**: "다른 AI가 해도 별 차이는 없겠지? 메인 소스가 없다고 해도."
- **답변**: **네, 차이가 없습니다.** 
  - 규격화된 `manifest.json`과 `Plugin-X_Guide.md`가 존재하는 한, 어떤 지능형 에이전트라도 동일한 규격의 플러그인을 생산하도록 시스템이 강제하기 때문입니다. 
  - 메인 소스를 건드리지 않는 설계는 **AI 협업 환경에서 가장 안전한 기술적 장치**입니다.

---
**AEGIS Ecosystem Development Reference v1.2**
**Case Study: TinyTuya Climate Control Integration**
