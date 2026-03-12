# AEGIS Plugin-X: 홈 어시스트 개발 실전 사례 (v4.0.0)

본 문서는 **TinyTuya 기반 에어컨 제어 시스템**을 AEGIS의 차세대 아키텍처인 **Plugin-X (v4.0.0)**로 이관하면서 논의된 핵심 설계 철학과 기술적 구현 사례를 상세히 기록합니다. v4.0.0은 Iframe 기반의 물리적 격리와 AXC(AEGIS Extreme Cache)를 통한 초고속 런타임을 지향합니다.

---

## 🎨 0. 시스템 구성도 (Visual Concept)

> [!NOTE]
> **[그림 1: AEGIS v4.0.0 Plugin-X 통합 아키텍처 다이어그램]**
> - **좌측 (Isolator)**: 독립된 Plugin 폴더 및 Iframe Sandbox (Manifest, Assets, Router)
> - **중앙 (Infrastructure)**: AEGIS Core (Modular Loader, AXC Engine, Capability Proxy, Security Service)
> - **우측 (Cognitive Layers)**: 서비스 레이어 (Routine Manager, AI Schema, Intelligence Hub, TTS)
> - **하단 (Hardware)**: IoT 하드웨어 (TinyTuya Hub, AC)

v4.0.0부터 모든 위젯은 **Iframe Isolation**을 통해 메인 시스템과 물리적으로 분리되며, **AXC** 기술을 통해 네트워크 레이턴시 없이 10ms 이내에 즉시 하이드레이션됩니다.

---

## 🏗️ 1. 개발 변천사 (AS-IS vs TO-BE)

### 1-0. 원본 스크립트 (AS-IS: 단일 절차형 구조)
통합 전에는 다음과 같이 루프 기반으로 동작하며 시스템 리소스를 독점하고 블로킹을 발생시키던 형태였습니다.

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

### 1-1. AEGIS 통합 구조 (TO-BE: Plugin-X v4.0.0)
위의 절차형 코드를 아래와 같이 역할별로 분산 배치하고 핵심 시스템과 완벽히 격리하여 안전성을 확보했습니다.

- **Backend (`climate_service.py`)**: 비즈니스 로직(TinyTuya 통신) 클래스화 및 OS 호환성을 고려한 **표준 유틸리티** 활용.
- **Router (`router.py`)**: v4.0.0 `initialize_plugin` 패턴을 통한 **확정적 액션(Deterministic Actions)** 및 브리핑 엔진 등록.
- **Frontend (`widget.js`)**: **Iframe Isolation** 기반의 격리된 런타임에서 **Event Delegation** 및 ES 모듈 로딩.
- **Automation (`manifest.json`)**: 루틴 매니저에게 센서 데이터 주권 및 실행 권한(Exports) 위임.

---

## 🛠️ 2. 핵심 API 및 도메인 지식 가이드 (Exhaustive Technical Details)

타 개발자나 AI가 작업을 인계받을 때 발생할 수 있는 '추측'에 의한 오류를 방지하기 위해 v4.0.0의 모든 명세를 기술합니다.

### 2-1. 시스템 표준 유틸리티 (`utils.py`)
모든 플러그인은 직접적인 `json.load` 대신 반드시 시스템 표준 유틸리티를 사용하여 파일 락(Lock) 및 인코딩 예외 처리를 수행해야 합니다.

| 함수명 | 파라미터 | 반환값 | 특징 |
|---|---|---|---|
| `load_json_config(path)` | `path`: 파일 절대경로 | `dict` | 파일 부재 시 `{}` 반환, `utf-8-sig` 자동 처리 |
| `save_json_config(path, data)` | `path`: 경로, `data`: 저장할 객체 | `bool` | 원자적 저장(Atomic Write)으로 데이터 손상 방지 |

### 2-2. 브리핑 엔진 및 액션 연동 (`services.plugin_registry`)
사용자가 "뉴스 브리핑해줘"라고 하거나 터미널 명령어를 입력할 때 플러그인을 참여시키기 위한 필수 패턴입니다.

- **Registry API**: 
  - `register_context_provider(plugin_id, provider_func, aliases=None)`: AI 브리핑 시 플러그인 데이터를 동적으로 주입.
  - `register_plugin_action(plugin_id, action_id, handler_func)`: **[v4.0]** `manifest.json`에 정의된 확정적 액션을 핸들러와 매핑. (AI 환각 방어의 핵심)
- **예시 (router.py)**:
  ```python
  def initialize_plugin():
      # 터미널에서 '/에어컨' 또는 '온도' 입력 시 이 플러그인의 데이터가 AI에게 제공됨
      register_context_provider("climate-control", get_climate, aliases=["에어컨", "실내온도"])
      # manifest.json의 'set_temp' 액션 발생 시 handle_set_temp 호출
      register_plugin_action("climate-control", "set_temp", handle_set_temp)
  ```

### 2-3. TinyTuya 도메인 특수 지식 (DPS Protocol)
이 부분은 하드웨어 제조사 규격이므로 AI가 임의로 '최적화' 하거나 수정해서는 안 되는 **Ground Truth**입니다.

- **DPS ID `201`**: 에어컨 통합 제어 채널 (Power, Temp, Mode, Fan을 한 번에 제어).
- **명령 객체 구조**: 반드시 `[{"code": "PowerOn", "value": "PowerOn"}, ...]` 형태의 **리스트 객체**여야 합니다.
- **JSON 직렬화 필수**: 해당 리스트를 `json.dumps()`를 통해 문자열로 변환한 뒤 `dps_data['201']`에 할당해야 TinyTuya 허브가 정상 인식합니다.

---

## 🏗️ 3. v4.0 아키텍처 피벗 이유 (철학적 배경)

### 3-1. Iframe Isolation vs Legacy Shadow DOM
- **과거 (Shadow DOM)**: 격리는 되었으나 메인 페이지의 CSS 변수나 JS 런타임 공유로 인해 예기치 못한 스타일 깨짐이나 전역 변수 오염이 간헐적으로 발생했습니다.
- **현재 (Iframe)**: 물리적으로 다른 Window 컨텍스트에서 실행됩니다. 에약된 `context` 객체(Capability Proxy)를 통해서만 시스템과 통신하며, 플러그인이 메인 시스템을 다운시키는 일을 원천 차단합니다.

### 3-2. AXC (AEGIS Extreme Cache)를 통한 성능 혁신
- Iframe 방식의 단점인 '초기 로딩 지연'을 해결하기 위해, 모든 자산을 IndexedDB에 캐싱합니다. SHA256 해시를 통해 버전 관리되므로, 시스템은 네트워크 요청 없이 내부 스토리지에서 즉각적으로 UI를 하이드레이션합니다.

---

## 🧩 4. 실제 구현: 전수 조사 기반 가이드

### 4-1. 데이터 노출 (manifest.json)
루틴 매니저가 이 플러그인을 "발견"할 수 있도록 하는 명세입니다.

```json
{
    "id": "climate-control",
    "name": "에어컨 통합 제어",
    "version": "4.0.0",
    "hybrid_level": 2,
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
                "endpoint": "/api/plugins/climate-control/status",
                "field": "temp"
            }
        ],
        "actions": [
            {
                "id": "ac_off",
                "name": "에어컨 끄기",
                "type": "terminal_command",
                "payload": { "command": "/ac off" }
            }
        ]
    }
}
```

### 4-2. 프론트엔드: Event Delegation 패턴 (widget.js)
v4.0.0에서는 개별 요소에 직접 리스너를 붙이지 않고 `root`에서 위임받아 처리합니다.

> [!TIP]
> **[v4.0.0 보안 팁]**: Iframe 샌드박스는 `origin: null`로 실행되므로, 외부 JS 파일을 임포트할 때 `/api/...` 와 같은 상대 절대 경로는 해석되지 않습니다. 반드시 `context.resolve('assets/my_module.js')`를 사용하여 **전체 URL(Absolute URL)**로 변환한 뒤 `await import()` 하십시오.

```javascript
export default {
    init: async function (root, context) {
        // ⛔ stopPropagation 호출 필수: 위젯 드래그(Move) 이벤트와의 간섭 차단
        root.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            e.stopPropagation();

            const action = btn.getAttribute('data-action');
            if (action === 'power-toggle') this.togglePower();
        });
        
        // 터미널 알리아스(/ac) 핸들러 등록
        context.registerCommand('/ac', (cmd) => this.handleCommand(cmd));
        
        await this.refresh();
    },
    // ... 나머지 구현부
};
```

### 4-3. 루틴 엔진의 조건 감시 논리
사용자가 루틴 매니저에서 "온도 28도 이상이면 에어컨 켜줘"라고 설정하면:
1.  **Poll**: 루틴 엔진이 `endpoint`를 호출하여 요약 컨텍스트를 수집.
2.  **Evaluate**: `field`와 `type`을 기반으로 `value`를 비교.
3.  **Execute**: 조건 충족 시 `exports.actions`에 정의된 명령어를 터미널로 발송하거나 `api_call` 수행.

---

## 💅 5. 프리미엄 디자인 및 UX
- **Glassmorphism**: `backdrop-filter: blur(12px)`와 시스템 네온 컬러를 활용한 UI.
- **Micro-animations**: 에어컨 가동 시 풍향 아이콘에 회전 애니메이션 적용.
- **UX**: 모든 인터랙티브 요소에 `.no-drag` 클래스를 부여하여 제어 도중 위젯이 의도치 않게 이동하는 것을 방지.

---

## 💡 종합 평가: AI 인계 시 결과물 차이
"기존의 모든 디테일을 유지하면서 v4.0.0 표준으로 마이그레이션이 가능한가?"라는 질문에 대해, 본 사례는 완벽한 긍정을 제시합니다. 규격화된 `manifest.json`과 `Plugin-X_Guide.md`가 존재하는 한, 어떠한 지능형 에이전트라도 **시스템 코어를 건드리지 않고** 동일한 품질의 플러그인을 생산할 수 있습니다. 이것이 AEGIS가 지향하는 **안전한 협업 프레임워크**의 실체입니다.

---
**AEGIS Ecosystem Development Reference v4.0.0**
**Case Study: TinyTuya Climate Control Integration & V4 Migration**
**Document Maintenance: AEGIS Core Team (No Summarization Policy Applied)**
