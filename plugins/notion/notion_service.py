import os
import json
import requests
from datetime import datetime
from routes.config import SECRETS_CONFIG_PATH, PLUGINS_DIR
from .rule_engine import NotionRuleEngine


class NotionService:
    """
    AEGIS Notion Service (v1.6.8 Modularized)
    Main API wrapper for Notion interactions. Business logic moved to specialized engines.
    """

    def __init__(
        self,
        secrets_path=SECRETS_CONFIG_PATH,
        config_path=None,
    ):
        # 1. 시크릿 로드
        if not os.path.exists(secrets_path):
            raise FileNotFoundError(f"Secrets file not found: {secrets_path}")

        with open(secrets_path, "r", encoding="utf-8") as f:
            secrets = json.load(f)
            self.api_key = secrets.get("NOTION_API_KEY")

        # 2. 전역 설정 로드 (Plugin-X 기본 경로 설정)
        if config_path is None:
            config_path = os.path.join(PLUGINS_DIR, "notion", "config.json")

        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Notion config file not found: {config_path}")

        with open(config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)
            self.database_id = self.config.get("default_database_id")
            self.workspaces = self.config.get("workspaces", [])

            # root에 default_database_id가 없으면 workspaces에서 is_default=True를 찾음
            if not self.database_id:
                for ws in self.workspaces:
                    if ws.get("is_default"):
                        self.database_id = ws.get("id")
                        break
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
        }

        # 3. 규칙 엔진 초기화
        self.rule_engine = NotionRuleEngine(self)

    def get_config(self):
        return self.config

    def get_database_id_by_alias(self, alias_or_name):
        """별칭(@업무) 또는 이름(업무)으로 DB ID 조회"""
        clean_alias = alias_or_name.replace("@", "")
        for ws in self.workspaces:
            if ws.get("alias") == clean_alias or ws.get("name") == clean_alias:
                return ws.get("id")
        return self.database_id

    def add_item(self, text, database_id=None):
        """터미널에서 입력받은 텍스트를 노션에 새로운 페이지로 추가"""
        db_id = database_id or self.database_id
        url = "https://api.notion.com/v1/pages"

        # 기본적인 텍스트 파싱 (v1.4: "내용 @워크스페이스" 패턴 지원)
        final_text = text
        if "@" in text:
            parts = text.split("@")
            final_text = parts[0].strip()
            ws_alias = parts[1].strip()
            db_id = self.get_database_id_by_alias(ws_alias)

        payload = {
            "parent": {"database_id": db_id},
            "properties": {
                "Name": {"title": [{"text": {"content": final_text}}]},
                "Date": {"date": {"start": datetime.now().isoformat()}},
                # Status나 다른 속성은 DB 템플릿에 따라 선택적
            },
        }

        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()

    def get_recent_items(self, limit=5, database_id=None):
        """최근 등록된 페이지 목록을 가져옴 (위젯용)"""
        db_id = database_id or self.database_id
        url = f"https://api.notion.com/v1/databases/{db_id}/query"

        payload = {
            "page_size": limit,
            "sorts": [{"timestamp": "created_time", "direction": "descending"}],
        }

        response = requests.post(url, headers=self.headers, json=payload)
        if not response.ok:
            return []

        results = response.json().get("results", [])
        items = []
        for res in results:
            # 제목 추출 (이름이 'Name' 또는 'title'일 수 있음)
            props = res.get("properties", {})
            title = "Untitled"
            for p_name, p_val in props.items():
                if p_val.get("type") == "title":
                    title_parts = p_val.get("title", [])
                    if title_parts:
                        title = title_parts[0].get("plain_text", "Untitled")
                    break

            items.append(
                {
                    "id": res.get("id"),
                    "title": title,
                    "url": res.get("url"),
                    "created_time": res.get("created_time"),
                    "properties": props,
                }
            )
        return items

    def search_items(self, query, limit=10):
        """워크스페이스 전체 검색"""
        url = "https://api.notion.com/v1/search"
        payload = {
            "query": query,
            "page_size": limit,
            "sort": {"direction": "descending", "timestamp": "last_edited_time"},
        }
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json().get("results", [])

    # 브릿지 메서드 (기존 라우트 호환성 유지)
    def evaluate_rules(self, rules_path=None):
        if rules_path is None:
            rules_path = os.path.join(PLUGINS_DIR, "notion", "rules.json")
        return self.rule_engine.evaluate_rules(rules_path)

    def apply_action_to_page(self, page_id, action):
        return self.rule_engine.apply_action_to_page(page_id, action)
