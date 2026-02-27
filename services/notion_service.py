import json
import requests
import os
from datetime import datetime


class NotionService:
    def __init__(
        self, secrets_path="config/secrets.json", config_path="config/notion.json"
    ):
        # 1. 시크릿 로드
        with open(secrets_path, "r", encoding="utf-8") as f:
            secrets = json.load(f)

        # 2. 일반 설정 로드 (하드코딩 방지)
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                self.config = json.load(f)
        else:
            self.config = {"widget_display_limit": 10, "notion_version": "2022-06-28"}

        self.api_key = secrets.get("NOTION_API_KEY", "").strip()

        # 워크스페이스 리스트 로드 및 기본값 설정
        self.workspaces = self.config.get("workspaces", [])
        default_ws = next((ws for ws in self.workspaces if ws.get("is_default")), None)

        # secrets.json의 레거시 ID 지원
        legacy_id = secrets.get("NOTION_DATABASE_ID", "").strip()
        self.db_id = default_ws.get("id") if default_ws else legacy_id

        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Notion-Version": self.config.get("notion_version", "2022-06-28"),
            "Content-Type": "application/json",
        }

    def get_config(self):
        """설정 정보를 외부로 노출"""
        return self.config

    def get_database_id_by_alias(self, alias_or_name):
        """별칭(@업무) 또는 이름(업무)으로 DB ID 조회"""
        if not alias_or_name:
            return None

        # 앞의 @ 제거 및 공백 정리
        target = alias_or_name.lstrip("@").strip()
        for ws in self.workspaces:
            if ws.get("name") == target or ws.get("alias").lstrip("@") == target:
                return ws.get("id")
        return None

    def add_item(self, text, database_id=None):
        """터미널에서 입력받은 텍스트를 노션에 새로운 페이지로 추가"""
        target_db = database_id or self.db_id
        url = "https://api.notion.com/v1/pages"

        # 타이틀 속성 이름 자동 감지
        db_url = f"https://api.notion.com/v1/databases/{target_db}"
        db_res = requests.get(db_url, headers=self.headers)
        db_res.raise_for_status()
        title_prop_name = next(
            (
                k
                for k, v in db_res.json().get("properties", {}).items()
                if v.get("type") == "title"
            ),
            "title",
        )

        payload = {
            "parent": {"database_id": target_db},
            "properties": {title_prop_name: {"title": [{"text": {"content": text}}]}},
            "children": [
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": f"Added via AEGIS Terminal at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                                },
                            }
                        ]
                    },
                }
            ],
        }

        response = requests.post(url, headers=self.headers, json=payload)
        return response.status_code == 200

    def get_recent_items(self, limit=5, database_id=None):
        """최근 등록된 페이지 목록을 가져옴 (위젯용)"""
        target_db = database_id or self.db_id
        url = f"https://api.notion.com/v1/databases/{target_db}/query"
        # 최근 생성일자 순으로 정렬
        payload = {
            "page_size": limit,
            "sorts": [{"timestamp": "created_time", "direction": "descending"}],
        }

        response = requests.post(url, headers=self.headers, json=payload)
        if response.status_code != 200:
            return []

        results = response.json().get("results", [])
        items = []
        for item in results:
            properties = item.get("properties", {})
            title = "Untitled"
            for prop_name, prop_data in properties.items():
                if prop_data.get("type") == "title":
                    title_list = prop_data.get("title", [])
                    if title_list:
                        title = title_list[0].get("plain_text", "Untitled")
                    break

            items.append(
                {
                    "id": item.get("id"),
                    "title": title,
                    "url": item.get("url"),
                    "created_time": item.get("created_time"),
                }
            )
        return items

    def search_items(self, query, limit=10):
        """Notion Search API를 사용하여 워크스페이스 전체(페이지, DB 포함) 검색"""
        url = "https://api.notion.com/v1/search"
        payload = {
            "query": query,
            "sort": {"direction": "descending", "timestamp": "last_edited_time"},
            "page_size": limit,
        }

        response = requests.post(url, headers=self.headers, json=payload)
        if response.status_code != 200:
            return []

        results = response.json().get("results", [])
        items = []
        for item in results:
            obj_type = item.get("object")
            title = "Untitled"

            # 타입별 제목 추출 분기
            if obj_type == "database":
                title_list = item.get("title", [])
                if title_list:
                    title = title_list[0].get("plain_text", "Untitled")
            elif obj_type == "page":
                properties = item.get("properties", {})
                # 페이지의 경우 'title', 'Name', 'Name ' 등 다양한 키가 존재할 수 있어 순회 감지
                for prop_name, prop_data in properties.items():
                    if prop_data.get("type") == "title":
                        title_list = prop_data.get("title", [])
                        if title_list:
                            title = title_list[0].get("plain_text", "Untitled")
                        break

            items.append(
                {
                    "id": item.get("id"),
                    "title": title,
                    "url": item.get("url"),
                    "type": obj_type,
                    "updated_time": item.get("last_edited_time"),
                }
            )
        return items

    def evaluate_rules(self, rules_path="config/notion_rules.json"):
        """규칙 정의서를 로드하여 데이터베이스 내 항목들이 규칙에 부합하는지 검토"""
        import re

        if not os.path.exists(rules_path):
            return {"success": False, "message": "Rules file not found."}

        with open(rules_path, "r", encoding="utf-8") as f:
            rules_config = json.load(f)

        if not rules_config.get("active", False):
            return {"success": False, "message": "Rules are currently inactive."}

        # 모든 규칙에 대해 검사 대상 수집
        all_potential_actions = []
        rules = rules_config.get("rules", [])

        # 쿼리 URL
        query_url = f"https://api.notion.com/v1/databases/{self.db_id}/query"

        # 0. 실제 제목 속성 이름 및 전체 속성 타입 정보 찾기
        db_url = f"https://api.notion.com/v1/databases/{self.db_id}"
        db_res = requests.get(db_url, headers=self.headers)
        db_res.raise_for_status()
        db_data = db_res.json()
        db_props = db_data.get("properties", {})

        title_prop_name = next(
            (k for k, v in db_props.items() if v.get("type") == "title"),
            "title",
        )

        for rule in rules:
            conditions = rule.get("conditions", {})
            title_contains = conditions.get("title_contains")
            title_regex = conditions.get("title_regex")
            prop_is_empty = conditions.get("property_is_empty")

            # 1단계: 기본적인 필터링 쿼리 (Notion API 활용)
            filter_payload = {"filter": {"and": []}}

            if title_contains:
                filter_payload["filter"]["and"].append(
                    {"property": title_prop_name, "title": {"contains": title_contains}}
                )

            if prop_is_empty:
                # Notion API 쿼리 시 select, status 등 타입별로 is_empty 필터 형식이 다름
                prop_info = db_props.get(prop_is_empty)
                if prop_info:
                    prop_type = prop_info.get("type")
                    filter_payload["filter"]["and"].append(
                        {"property": prop_is_empty, prop_type: {"is_empty": True}}
                    )
                else:
                    # 속성 정보를 못 찾은 경우 기본 fallback (동작하지 않을 수 있음)
                    filter_payload["filter"]["and"].append(
                        {"property": prop_is_empty, "is_empty": True}
                    )

            # 필터가 하나도 없으면 전체 쿼리 (최대 100개)
            if not filter_payload["filter"]["and"]:
                payload = {"page_size": 100}
            else:
                payload = filter_payload

            res = requests.post(query_url, headers=self.headers, json=payload)
            if res.status_code == 200:
                pages = res.json().get("results", [])
                for page in pages:
                    # 페이지 제목 추출 (동적 속성명 사용)
                    title = "Untitled"
                    props = page.get("properties", {})
                    title_data = props.get(title_prop_name)
                    if title_data and title_data.get("type") == "title":
                        title_list = title_data.get("title", [])
                        if title_list:
                            title = title_list[0].get("plain_text", "Untitled")

                    # 2단계: 정규식 추가 검사 (Python re 모듈)
                    is_match = True
                    if title_regex:
                        try:
                            if not re.search(title_regex, title):
                                is_match = False
                        except re.error:
                            print(f"[NotionService] Invalid Regex: {title_regex}")
                            is_match = False

                    if is_match:
                        # 중복 추가 방지
                        if not any(
                            a["page_id"] == page.get("id")
                            for a in all_potential_actions
                        ):
                            all_potential_actions.append(
                                {
                                    "page_id": page.get("id"),
                                    "title": title,
                                    "rule_name": rule.get("name"),
                                    "action": rule.get("action"),
                                    "url": page.get("url"),
                                }
                            )

        return {
            "success": True,
            "matches": all_potential_actions,
            "safety_level": rules_config.get("safety_level", "ask_always"),
        }

    def apply_action_to_page(self, page_id, action):
        """특정 페이지에 지정된 액션(속성 변경)을 적용"""
        target_prop = action.get("target_property")
        target_val = action.get("target_value")

        if not target_prop or not target_val:
            return False

        # 해당 페이지의 속성 정보 조회 (타입 확인용)
        page_url = f"https://api.notion.com/v1/pages/{page_id}"
        page_res = requests.get(page_url, headers=self.headers)
        if page_res.status_code != 200:
            return False

        props = page_res.json().get("properties", {})
        prop_info = props.get(target_prop)
        if not prop_info:
            return False

        prop_type = prop_info.get("type")

        # 타입에 맞는 페이로드 구성
        update_payload = {"properties": {}}

        if prop_type == "select":
            update_payload["properties"][target_prop] = {"select": {"name": target_val}}
        elif prop_type == "status":
            update_payload["properties"][target_prop] = {"status": {"name": target_val}}
        elif prop_type == "multi_select":
            update_payload["properties"][target_prop] = {
                "multi_select": [{"name": target_val}]
            }
        else:
            # 기타 타입은 현재 안전을 위해 지원 제외하거나 텍스트로 시도
            return False

        res = requests.patch(page_url, headers=self.headers, json=update_payload)
        return res.status_code == 200
