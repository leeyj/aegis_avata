import json
import os
import requests


class NotionRuleEngine:
    """
    AEGIS Notion Rule Engine:
    규칙 정의서를 로드하여 데이터베이스 내 항목들이 규칙에 부합하는지 검토하고 액션을 정의합니다.
    """

    def __init__(self, service):
        self.service = service  # NotionService 인스턴스 참조

    def evaluate_rules(self, rules_path):
        """규칙 정의서를 로드하여 데이터베이스 내 항목들을 검토"""
        if not os.path.exists(rules_path):
            return {"status": "error", "message": "Rules file not found"}

        try:
            with open(rules_path, "r", encoding="utf-8") as f:
                rules_data = json.load(f)
        except Exception as e:
            return {"status": "error", "message": f"Failed to load rules: {e}"}

        if not rules_data.get("active", True):
            return []

        rules = rules_data.get("rules", [])
        results = []

        # 기본 DB에서 최근 항목 가져오기 (전 규칙 공용)
        try:
            items = self.service.get_recent_items(limit=50)
        except Exception as e:
            return {"status": "error", "message": f"Failed to fetch items: {e}"}

        # 모든 규칙 순회
        for rule in rules:
            conditions = rule.get("conditions", {})
            action = rule.get("action", {})

            title_keyword = conditions.get("title_contains", "")
            empty_prop = conditions.get("property_is_empty", "")

            for item in items:
                title = item.get("title", "")
                properties = item.get("properties", {})
                match = True

                # 조건 1: 제목에 키워드 포함 여부
                if title_keyword and title_keyword not in title:
                    match = False

                # 조건 2: 특정 속성이 비어있는지 (select/status 계열)
                if match and empty_prop:
                    prop_data = properties.get(empty_prop, {})
                    actual_value = self._extract_value(prop_data)
                    if actual_value:  # 값이 이미 있으면 정리 불필요
                        match = False

                if match:
                    results.append(
                        {
                            "rule_name": rule.get("name"),
                            "page_id": item.get("id"),
                            "title": title,
                            "action": action,
                        }
                    )

        return results

    def _extract_value(self, prop_data):
        """Notion 속성 데이터에서 실제 값 추출"""
        ptype = prop_data.get("type")
        if ptype == "select":
            return prop_data.get("select", {}).get("name")
        elif ptype == "multi_select":
            return [x.get("name") for x in prop_data.get("multi_select", [])]
        elif ptype == "title":
            return "".join(
                [x.get("plain_text", "") for x in prop_data.get("title", [])]
            )
        elif ptype == "rich_text":
            return "".join(
                [x.get("plain_text", "") for x in prop_data.get("rich_text", [])]
            )
        elif ptype == "status":
            return prop_data.get("status", {}).get("name")
        elif ptype == "checkbox":
            return prop_data.get("checkbox")
        return None

    def _check_condition(self, actual, operator, expected):
        """조건 연산자 처리"""
        if operator == "equals":
            return actual == expected
        elif operator == "contains":
            if isinstance(actual, list):
                return expected in actual
            return expected in (actual or "")
        elif operator == "not_equals":
            return actual != expected
        elif operator == "is_empty":
            return not actual
        return False

    def apply_action_to_page(self, page_id, action):
        """특정 페이지에 지정된 액션(속성 변경)을 적용"""
        url = f"https://api.notion.com/v1/pages/{page_id}"

        # rules.json 형식 호환: { "target_property": "Type", "target_value": "폐기" }
        # 기존 형식 호환:     { "type": "set_property", "property": "Status", "value": "Done" }
        prop_name = action.get("target_property") or action.get("property")
        value = action.get("target_value") or action.get("value")
        action_type = action.get("type", "set_property")  # 기본값: set_property

        if not prop_name or not value:
            return False

        if action_type == "set_property" or action.get("target_property"):
            payload = {"properties": {}}

            if prop_name == "Status":
                payload["properties"][prop_name] = {"status": {"name": value}}
            elif prop_name in ("Category", "Select", "Type"):
                payload["properties"][prop_name] = {"select": {"name": value}}
            elif prop_name == "Tags":
                payload["properties"][prop_name] = {
                    "multi_select": [{"name": v} for v in value]
                    if isinstance(value, list)
                    else [{"name": value}]
                }
            else:
                # 기본 fallback: select 타입으로 시도
                payload["properties"][prop_name] = {"select": {"name": value}}

            try:
                res = requests.patch(url, headers=self.service.headers, json=payload)
                return res.ok
            except Exception:
                return False

        return False
