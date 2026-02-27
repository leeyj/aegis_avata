# Notion API Routes [Routes]

노션 위젯 및 터미널 통합을 지원하는 Flask 블루프린트 라우트입니다.

## 파일 정보
- **경로:** `routes/notion_routes.py`
- **블루프린트 이름:** `notion`

## API 엔드포인트

### 1. 항목 추가 (`POST /api/notion/add`)
- **설명:** 터미널 명령(/n, /todo)을 수신하여 노션에 새 항목을 추가합니다.
- **Payload:** 
  ```json
  {
    "text": "기록할 내용",
    "workspace": "@별칭 (선택 사항)"
  }
  ```
- **반환값:** 성공 여부와 메시지 JSON

### 2. 최근 항목 조회 (`GET /api/notion/recent`)
- **설명:** 노션 위젯에 표시할 최근 항목 리스트를 반환합니다.
- **Query Params:** `limit`, `database_id` (선택 사항)

### 3. 지식 검색 (`GET /api/notion/search`)
- **설명:** 워크스페이스 내 모든 페이지/DB를 대상으로 전체 텍스트 검색을 수행합니다.
- **Query Params:** `query` (검색어), `limit` (조회수)

### 4. 정리 규칙 검토 (`GET /api/notion/rules/evaluate`)
- **설명:** 활성화된 정리 규칙에 따라 데이터베이스 항목들을 스캔하고 결과를 보고합니다.

### 5. 정리 규칙 적용 (`POST /api/notion/rules/apply`)
- **설명:** 검토된 특정 항목에 대해 규칙에 정의된 액션(속성 업데이트)을 실제로 실행합니다.
- **Payload:** `{"page_id": "UUID", "action": { ... }}`

### 6. 지식 브리핑 수행 (`GET /api/notion/brief`)
- **설명:** 현재 선택된 AI 엔진을 통해 노션 데이터를 요약 분석합니다.
- **Query Params:** `model` (gemini, grok, ollama 등)

### 7. 설정 조회 (`GET /api/notion/config`)
- **설명:** 프론트엔드 위젯 초기화 및 설정을 위해 `notion.json` 데이터를 반환합니다.

## 위젯 연동 (Frontend)
- **HTML:** `templates/components/notion_widget.html`
- **JS:** `static/js/widgets/notion.js`
- **CSS:** `static/css/components/notion.css`
