# AEGIS Intelligence - 통합 시스템 명세서 (SPECIFICATION)

**최종 업데이트: 2026-03-11 (v4.0.0 Hybrid/Iframe Standard)**
이 문서는 AEGIS v4.0의 백엔드/프론트엔드 핵심 설계 원칙 및 시스템 사양을 정의합니다.

---

## 🏗️ 1. 핵심 아키텍처 설계 원칙 (Design Principles)

### 1.1 Pure Iframe Isolation (v4.0 핵심)
- 모든 위젯은 독립된 **Iframe** 내에서 실행됩니다.
- 부모 페이지(Main UI)와의 물리적 격리를 통해 전역 변수 오염 및 CSS 간섭을 원천 차단합니다.
- 메인 시스템과의 통신은 오직 `postMessage` 기반의 **PluginContext**를 통해서만 안전하게 이루어집니다.

### 1.2 Resource Proxy & Capability Bridge
- 플러그인은 브라우저 API나 파일 시스템에 직접 접근하는 대신, 시스템이 제공하는 `context` 브릿지를 사용합니다.
- 권한이 필요한 작업(TTS, AI 요청, 시스템 설정 변경 등)은 `manifest.json`에 정의된 권한에 따라 중앙 통제됩니다.

### 1.3 ES Module & Async Loading
- 위젯 로직은 ES 모듈 표준(`${id}/assets/widget.js`)을 따르며, 필요 시 대규모 모듈을 동적으로 임포트(`import()`)할 수 있습니다.
- 자산의 위치는 `context.resolve()`를 통해 동적으로 결정되므로, 개발 환경과 실제 배포 환경의 경로 차이를 고민할 필요가 없습니다.

### 1.4 Event Delegation & Non-Blocking Interaction
- **data-action**: HTML 요소에 행위 중심의 속성을 부여하고, 루트에서 이벤트를 일괄 캡처하여 처리하는 방식을 권장합니다.
- **Propagation Control**: 위젯 내부의 클릭이 아바타 드래그나 시스템 이벤트를 방해하지 않도록 엄격한 이벤트 버블링 차단 정책을 적용합니다.

---

## 🧩 2. 시스템 인터페이스 (API Specs)

### 2.1 PluginContext API (Frontend)
| 함수 | 설명 |
|---|---|
| `resolve(path)` | 상대 경로를 런타임 절대 URL로 변환 |
| `requestCore(cmd, args)` | 시스템 코어 이벤트 호출 (RELOAD_CONFIG, SHOW_MODAL 등) |
| `onSystemEvent(evt, callback)` | 전역 동기화 신호(SYNC, REFRESH) 수신 |
| `speak(display, briefing)` | 통합 음성 및 시각 브리핑 실행 |

### 3.2. Exports (Inter-plugin Connectivity)
Each plugin can expose its state and capabilities for the Routine Manager:
- `sensors`: Real-time data points (e.g., Temperature, Stock Price).
- `commands`: Terminal command guides and prefixes.
- `actions`: Deterministic actions that can be triggered by routines (e.g., Briefing, Playback).

#### manifest.json - exports format:
```json
"exports": {
  "sensors": [
    { "id": "tid", "name": "Name", "unit": "Unit", "type": "number", "endpoint": "/api/...", "field": "key" }
  ],
  "commands": [
    { "prefix": "/pfx", "name": "Name", "examples": ["/pfx arg"] }
  ],
  "actions": [
    { "id": "aid", "name": "Name", "description": "Desc", "type": "terminal_command", "payload": { "command": "/cmd" } }
  ]
}
```
### 2.2 Backend Router Pattern
- `/api/plugins/{id}/...` 형태의 고정된 API 경로 사용.
- `initialize_plugin()`을 통한 확정적 액션(Deterministic Actions) 및 브리핑 데이터 공급자(Context Provider) 등록 의무화.

---
**AEGIS v4.0 Architectural Standard**
