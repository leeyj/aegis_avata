# Notion Service [Services]

노션 API와 통신하여 데이터를 기록하고 조회하는 핵심 서비스 모듈입니다.

## 파일 정보
- **경로:** `services/notion_service.py`
- **주요 목적:** Notion Database와의 인터랙션 처리 (CRUD 및 설정 관리)

## 주요 기능

### 1. 초기화 및 설정 로드 (`__init__`)
- `config/secrets.json`에서 API 키와 데이터베이스 ID를 로드합니다.
- `config/notion.json`에서 하드코딩되지 않은 설정(API 버전, 표시 제한 등)을 로드합니다.

### 2. 별칭 기반 데이터베이스 조회 (`get_database_id_by_alias`)
- **설명:** 별칭(예: `@업무`) 또는 이름으로 설정된 데이터베이스 ID를 찾습니다.
- **특징:** `@` 접두사를 자동으로 처리하며, 다중 워크스페이스 지원의 핵심 로직입니다.

### 3. 항목 추가 (`add_item`)
- **설명:** 지정된 또는 기본 데이터베이스에 새로운 페이지를 추가합니다.
- **매개변수:** `text`, `database_id` (옵션)
- **특징:** 타이틀 속성명을 자동 감지하며, 생성 시각 정보가 포함된 자식 블록을 함께 생성합니다.

### 4. 최근 항목 조회 (`get_recent_items`)
- **설명:** 특정 데이터베이스의 최근 페이지 목록을 가져옵니다.
- **매개변수:** `limit`, `database_id` (옵션)

### 5. 전역 검색 (`search_items`)
- **설명:** Notion Search API를 사용하여 워크스페이스 내의 모든 페이지와 데이터베이스를 검색합니다.

### 6. 규칙 기반 정리 검토 (`evaluate_rules`)
- **설명:** `notion_rules.json`에 정의된 규칙에 따라 정리 대상을 스캔합니다.
- **특징:** 제목 포함 단어, 정규식, 속성 비어있음 여부 등을 복합적으로 판단합니다.

### 7. 규칙 적용 (`apply_action_to_page`)
- **설명:** 검토된 항목의 속성(Select, Status 등)을 규칙에 정의된 값으로 일괄 변경합니다.

## 설정 파일 데이터 구조 (`config/notion.json`)
```json
{
    "widget_display_limit": 10,
    "workspaces": [
        {
            "name": "업무",
            "alias": "@업무",
            "id": "DATABASE_ID",
            "is_default": true
        }
    ],
    "notion_version": "2022-06-28"
}
```

## 의존성
- `requests`: Notion API 호출 용
- `json`, `os`, `datetime`: 데이터 처리 및 환경 설정 용
