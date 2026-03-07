# 🐛 Bug Report — 2026-03-02 10:00 Session
> **세션 범위:** Plugin-X 아키텍처 완성 및 안정화  
> **담당 AI:** Antigravity  
> **상태:** 수정 완료 (테스트 대기)

---

## 요약

이번 세션에서 총 **8건의 버그**를 발견하고 수정했습니다.  
모든 버그는 Plugin-X 모듈화 리팩토링 과정에서 발생한 **구조적 불일치**가 원인입니다.

| # | 버그 | 심각도 | 상태 | 수정 파일 |
|---|---|---|---|---|
| 001 | 네임스페이스 충돌 (전역 404) | 🔴 Critical | ✅ | `routes/plugins.py`, 전체 `router.py` |
| 002 | LocalProxy 컨텍스트 에러 | 🔴 Critical | ✅ | `routes/plugins.py` |
| 003 | 노션 위젯 빈 화면 | 🟡 Major | ✅ | `plugins/notion/notion_service.py` |
| 004 | `this.handleSearch is not a function` | 🟡 Major | ✅ | `plugins/notion/assets/widget.js` |
| 005 | 레거시 API 경로 잔존 | 🟠 Moderate | ✅ | `terminal_notion.js`, `search_window.js` |
| 006 | `/ns clean` 500 에러 (라우터 응답 형식) | 🟡 Major | ✅ | `plugins/notion/router.py` |
| 007 | `/ns clean` 500 에러 (규칙 엔진 파싱) | 🔴 Critical | ✅ | `plugins/notion/rule_engine.py` |
| 008 | YouTube Music 비표준 경로 | 🟠 Moderate | ✅ | `plugins/youtube-music/router.py`, `widget.js` |

---

## BUG-001: 네임스페이스 충돌로 인한 전역 404

**증상:** 여러 플러그인의 `/api/plugins/...` 라우트가 404 반환  
**원인:** 모든 플러그인이 `service.py`라는 동일 파일명을 사용하여, Python이 먼저 로드된 모듈을 전역 캐시에서 재사용  
**해결:**
- 서비스 파일명을 `{plugin_id}_service.py`로 고유화
- 로더를 `importlib.util.spec_from_file_location` 기반으로 전면 교체
- 모든 플러그인 폴더에 `__init__.py` 생성 (패키지화)
- 임포트를 상대 경로(`from .notion_service import ...`)로 통일

---

## BUG-002: LocalProxy 컨텍스트 에러 (스케줄러 404)

**증상:** `RuntimeError: Working outside of request context` → 블루프린트 미등록 → 404  
**원인:** 로더가 모듈 내 모든 속성을 순회하며 `hasattr(attr, 'name')`을 호출할 때, Flask의 `request` (LocalProxy)가 컨텍스트 없이 접근되어 예외 발생  
**해결:**
```python
# 변경 전 (위험): hasattr 먼저 → LocalProxy 터짐
if hasattr(attr, 'name') and isinstance(attr, Blueprint):

# 변경 후 (안전): isinstance 먼저 → LocalProxy 건드리지 않음
is_bp = isinstance(attr, Blueprint) or type(attr).__name__ == 'Blueprint'
if is_bp and hasattr(attr, 'name'):
```

---

## BUG-003: 노션 위젯 빈 화면

**증상:** 설정 완료 상태에서도 위젯이 비어 나옴  
**원인:** `config.json`에 루트 `default_database_id`가 없고, 실제 ID가 `workspaces[].id`에만 존재  
**해결:** `NotionService.__init__`에서 `workspaces`를 순회하여 `is_default: true` 항목의 ID를 자동 선택

---

## BUG-004: `this.handleSearch is not a function`

**증상:** 터미널에서 `/ns cleanup` 등 명령 입력 시 TypeError  
**원인:** `widget.js`의 `init()`에서 `context.registerCommand('/ns', (cmd) => this.handleSearch(cmd))`로 등록하지만, `handleSearch`가 widget 객체에 정의되어 있지 않음 (별도의 `terminal_notion.js`에만 존재)  
**해결:** `handleAdd`, `handleSearch`, `handleCleanup`, `handleApplyCleanup`, `setWorkspace` 5개 메소드를 `widget.js` export 객체에 직접 통합  
**후속 조치:** `terminal_notion.js` 파일 삭제, `index.html`에서 `<script>` 태그 제거 (Plugin-X 격리 정책 적용)

---

## BUG-005: 레거시 API 경로 잔존

**증상:** Notion 관련 터미널 명령 시 404  
**원인:** 백엔드는 `/api/plugins/notion/...`으로 변경되었으나, 프론트엔드 3개 파일이 구버전 경로 사용  
**해결:**

| 파일 | 변경 전 | 변경 후 |
|---|---|---|
| `terminal_notion.js` (삭제됨) | `/api/notion/add` | `/api/plugins/notion/add` |
| `terminal_notion.js` (삭제됨) | `/api/notion/rules/evaluate` | `/api/plugins/notion/rules/evaluate` |
| `terminal_notion.js` (삭제됨) | `/api/notion/rules/apply` | `/api/plugins/notion/rules/apply` |
| `search_window.js` | `/api/notion/search` | `/api/plugins/notion/search` |

---

## BUG-006: `/ns clean` 500 에러 (라우터 응답 형식)

**증상:** `/ns clean` 명령 시 500, 브라우저에 `Unexpected token '<'` 표시  
**원인:** `rule_engine.evaluate_rules()`가 Python `list`를 반환하는데, 라우터가 이를 그대로 `jsonify()`에 전달. 프론트엔드는 `{ success, matches }` 형식을 기대  
**해결:**
```python
# 응답 정규화 + 예외 방어
try:
    result = notion_service.evaluate_rules()
    if isinstance(result, dict) and result.get("status") == "error":
        return jsonify({"success": False, "matches": [], "message": result.get("message")})
    return jsonify({"success": True, "matches": result if isinstance(result, list) else []})
except Exception as e:
    return jsonify({"success": False, "matches": [], "message": str(e)}), 500
```

---

## BUG-007: `/ns clean` 500 에러 (규칙 엔진 파싱) ⭐ 근본 원인

**증상:** BUG-006 수정 이후에도 500 에러 지속  
**원인 (3단계 복합):**

1. **`rules.json`의 `conditions`가 딕셔너리인데 배열로 순회:**
   ```json
   // rules.json 실제 형식
   "conditions": { "title_contains": "[폐기]", "property_is_empty": "Type" }
   
   // rule_engine.py가 기대하는 형식
   "conditions": [{ "property": "Type", "operator": "equals", "value": "폐기" }]
   ```
   딕셔너리를 `for condition in conditions:`로 순회하면 키 문자열(`"title_contains"`)만 반복되어 `condition.get("property")`에서 `AttributeError` 발생.

2. **`rules.json`의 `action`이 단수형인데 `actions`(복수)로 참조:**
   ```json
   // rules.json: "action": { "target_property": "Type", "target_value": "폐기" }
   // rule_engine.py: rule.get("actions")  ← undefined
   ```

3. **`apply_action_to_page()`가 `rules.json` 형식을 인식 못함:**
   `{ target_property, target_value }` 형식을 `{ type: "set_property", property, value }`로만 처리하여 항상 `return False`.

**해결:**
- `evaluate_rules()` 전면 재작성: `title_contains`/`property_is_empty` 딕셔너리 형식 정식 지원
- 결과에 `action` (단수) 포함
- `apply_action_to_page()`에서 양쪽 형식 모두 지원, `Type` 속성을 `select` 타입으로 매핑

---

## BUG-008: YouTube Music 비표준 경로

**증상:** 즉시 에러는 없으나, 보안 시스템이 플러그인 ID를 식별하지 못함  
**원인:** `/yt/playlists` 등 비표준 접두사 사용 → `get_plugin_id_from_request()`가 `None` 반환 → 권한 체크 우회  
**해결:** 모든 라우트를 `/api/plugins/youtube-music/...`으로 마이그레이션 (백엔드 4개, 프론트엔드 2개)

---

## 추가 조치: 정책 문서화

- `docs/Plugin-X_Guide.md`를 v1.7로 전면 업데이트
- **6가지 금지 규칙(⛔ HARD RULES)** 명문화
- AI 간 무분별한 정책 위반을 문서 차원에서 차단

---
**보고 완료: 2026-03-02 10:00 KST**
