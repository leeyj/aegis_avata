# AEGIS Plugin-X: 5분 퀵 스타트

> 이 문서는 **지금 당장 플러그인을 만들고 싶은** 개발자를 위한 최단 경로입니다.  
> 모든 규칙과 API의 상세 정의는 [`PLUGIN_SPEC.md`](PLUGIN_SPEC.md)를 참조하세요.

---

## 1단계: 골격 생성 (30초)

프로젝트 루트에서 실행하세요:

```bash
python create_plugin.py --id my-widget --name "나의 위젯"
```

이 명령 하나로 다음 파일이 자동 생성됩니다:

```
plugins/my-widget/
├── __init__.py            # 패키지 선언 (빈 파일, 삭제 금지)
├── manifest.json          # 메타데이터, 권한, exports
├── config.json            # 플러그인 설정 저장소
├── router.py              # Flask Blueprint (백엔드 API)
├── my_widget_service.py   # 핵심 비즈니스 로직
└── assets/
    ├── widget.html        # UI 골격 (Shadow DOM)
    ├── widget.js          # 프론트엔드 로직 (init/destroy)
    └── widget.css         # 스타일 (Shadow DOM 격리)
```

### 자주 쓰는 옵션

```bash
# 권한이 필요한 플러그인
python create_plugin.py --id stock-alert --name "주식 알림" \
    --permissions api.ai_gateway \
    --csp-domains "https://api.example.com"

# UI 없는 백그라운드 서비스
python create_plugin.py --id bg-worker --name "백그라운드 워커" --hidden

# 백엔드 없는 순수 프론트엔드 위젯
python create_plugin.py --id simple-clock --name "시계" --no-backend
```

---

## 2단계: 비즈니스 로직 구현 (3분)

생성된 파일에서 `TODO` 주석이 달린 부분만 수정하면 됩니다.

### 백엔드: `my_widget_service.py`

```python
class MyWidgetService:
    @staticmethod
    def get_data(config: dict = None) -> dict:
        # TODO: 여기에 실제 로직을 구현하세요
        # 예: 외부 API 호출, DB 조회, 파일 파싱 등
        return {
            "value": 42,
            "message": "데이터 로드 완료"
        }

    @staticmethod
    def get_status() -> dict:
        # TODO: AI 브리핑에 포함될 상태 요약
        return {"summary": "나의 위젯이 정상 동작 중입니다."}
```

### 프론트엔드: `assets/widget.js`

`refresh()` 메서드에서 데이터를 받아 UI를 갱신합니다:

```javascript
async refresh() {
    const res = await fetch('/api/plugins/my-widget/data');
    const data = await res.json();
    const el = this.shadow.querySelector('#status-text');
    if (el) el.textContent = data.message;
}
```

---

## 3단계: 실행 확인 (30초)

1. Flask 서버를 재시작합니다.
2. 브라우저에서 대시보드를 새로고침합니다.
3. 사이드바에 "나의 위젯"이 자동으로 나타납니다.
4. 터미널에서 `/my-widget status`를 입력하면 명령어가 동작합니다.

---

## 4단계: 더 알고 싶다면

| 목적 | 읽을 문서 |
|---|---|
| 모든 규칙, API, 스키마 상세 | [`PLUGIN_SPEC.md`](PLUGIN_SPEC.md) |
| 다른 AI에게 위젯 개발 요청 | [`AI_AGENT_PROMPT.md`](AI_AGENT_PROMPT.md) — 복사-붙여넣기 |
| 과거 검증/감사 기록 | `archive/` 폴더 |
| 시스템 전체 아키텍처 | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| 보일러플레이트 옵션 전체 | `python create_plugin.py --help` |

---
*이 문서는 `create_plugin.py`가 생성하는 코드를 기반으로 합니다. 생성기가 약 20개의 필수 규칙을 자동으로 준수하므로, 개발자는 비즈니스 로직에만 집중할 수 있습니다.*
