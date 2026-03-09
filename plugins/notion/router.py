from flask import Blueprint, request, jsonify
from .notion_service import NotionService
from routes.decorators import login_required
from services import require_permission
from services.plugin_registry import register_context_provider
from utils import get_plugin_i18n

notion_plugin_bp = Blueprint("notion_plugin", __name__)
notion_service = NotionService()


# 0. Plugin-X Context Provider 등록
def get_notion_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API (기본)"""
    limit = notion_service.get_config().get("briefing_limit", 5)
    return notion_service.get_recent_items(limit=limit)


def get_notion_ai_context():
    """AI를 위한 데이터 정제 버전 (ID 및 복잡한 속성 제거)"""
    items = get_notion_context()
    return [
        {"title": item["title"], "created_time": item["created_time"]} for item in items
    ]


register_context_provider(
    "notion",
    get_notion_context,
    ai_processor=get_notion_ai_context,
    aliases=["노션", "메모", "문서"],
)


def initialize_plugin():
    """노션 플러그인 초기화 및 BotManager 액션 등록 (Systemic v3.6.0)"""
    from services.plugin_registry import register_plugin_action

    def add_memo_handler(content):
        return notion_service.add_item(content)

    def notion_add_view_handler(result, platform="web", lang=None):
        if result is True:
            return get_plugin_i18n("notion", "views.success", lang=lang)
        return get_plugin_i18n("notion", "views.fail", lang=lang)

    register_plugin_action(
        plugin_id="notion",
        action_id="add",
        handler=add_memo_handler,
        desc=get_plugin_i18n("notion", "actions.add.desc"),
        args=get_plugin_i18n("notion", "actions.add.args"),
        view_handler=notion_add_view_handler,
    )


initialize_plugin()


@notion_plugin_bp.route("/api/plugins/notion/add", methods=["POST"])
@login_required
@require_permission("api.notion")
def add_notion_item():
    data = request.json
    text = data.get("text", "").strip()
    workspace_name = data.get("workspace")

    if not text:
        return jsonify({"success": False, "message": "Text is empty"}), 400

    target_id = None
    if workspace_name:
        target_id = notion_service.get_database_id_by_alias(workspace_name)
        if not target_id:
            return jsonify(
                {"success": False, "message": f"Workspace '{workspace_name}' not found"}
            ), 404

    success = notion_service.add_item(text, database_id=target_id)
    if success:
        return jsonify({"success": True, "message": "Successfully added to Notion"})
    else:
        return jsonify({"success": False, "message": "Failed to add to Notion"}), 500


@notion_plugin_bp.route("/api/plugins/notion/config", methods=["GET"])
@login_required
@require_permission("api.notion")
def get_notion_config():
    return jsonify({"success": True, "config": notion_service.get_config()})


@notion_plugin_bp.route("/api/plugins/notion/recent", methods=["GET"])
@login_required
@require_permission("api.notion")
def get_recent_notion_items():
    default_limit = notion_service.get_config().get("widget_display_limit", 10)
    limit = request.args.get("limit", default_limit, type=int)
    items = notion_service.get_recent_items(limit=limit)
    return jsonify({"success": True, "items": items})


@notion_plugin_bp.route("/api/plugins/notion/search", methods=["GET"])
@login_required
@require_permission("api.notion")
def search_notion_items():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify({"success": False, "message": "Search query is empty"}), 400

    limit = request.args.get("limit", 10, type=int)
    items = notion_service.search_items(query, limit=limit)
    return jsonify({"success": True, "items": items})


@notion_plugin_bp.route("/api/plugins/notion/brief", methods=["GET"])
@login_required
@require_permission("api.notion")
def brief_notion_items():
    model = request.args.get("model", "gemini")
    config = notion_service.get_config()
    limit = config.get("briefing_limit", 5)

    items = notion_service.get_recent_items(limit=limit)
    if not items:
        return jsonify({"success": False, "message": "No items found for briefing"})

    # 2. 프롬프트 구성 (Plugin-X)
    from services.gemini_service import _load_plugin_prompt

    data_list = [f"- {item['title']} (생성: {item['created_time']})" for item in items]
    data_str = "\n".join(data_list)
    prompt_tpl = _load_plugin_prompt("notion", "assistant_briefing")

    if not prompt_tpl:
        prompt_tpl = "Notion summary for {{count}} items: {{data}}"

    final_prompt = prompt_tpl.replace("{{count}}", str(len(items))).replace(
        "{{data}}", data_str
    )

    from services.ai_service import query_ai

    ai_res = query_ai(final_prompt, source_key=model, is_system=True)

    if ai_res.get("status") == "success" or "display" in ai_res:
        response_data = {
            "success": True,
            "display": ai_res.get("display"),
            "briefing": ai_res.get("briefing"),
            "sentiment": ai_res.get("sentiment", "neutral"),
        }
    else:
        return jsonify({"success": False, "message": ai_res.get("message")}), 500

    return jsonify(response_data)


@notion_plugin_bp.route("/api/plugins/notion/rules/evaluate", methods=["GET"])
@login_required
@require_permission("api.notion")
def evaluate_notion_rules():
    try:
        result = notion_service.evaluate_rules()
        # rule_engine이 에러 딕셔너리를 반환한 경우
        if isinstance(result, dict) and result.get("status") == "error":
            return jsonify(
                {
                    "success": False,
                    "matches": [],
                    "message": result.get("message", "Unknown error"),
                }
            )
        # 정상적으로 매치 결과 리스트를 반환한 경우
        return jsonify(
            {"success": True, "matches": result if isinstance(result, list) else []}
        )
    except Exception as e:
        return jsonify({"success": False, "matches": [], "message": str(e)}), 500


@notion_plugin_bp.route("/api/plugins/notion/rules/apply", methods=["POST"])
@login_required
@require_permission("api.notion")
def apply_notion_rule():
    data = request.json
    page_id = data.get("page_id")
    action = data.get("action")

    if not page_id or not action:
        return jsonify({"success": False, "message": "Missing page_id or action"}), 400

    success = notion_service.apply_action_to_page(page_id, action)
    return jsonify({"success": success})
