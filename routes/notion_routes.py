from flask import Blueprint, request, jsonify
from services.notion_service import NotionService
from services.ai_service import query_ai
from services.gemini_service import query_gemini
from utils import load_json_config
from routes.config import PROMPTS_CONFIG_PATH

notion_bp = Blueprint("notion", __name__)
notion_service = NotionService()


@notion_bp.route("/api/notion/add", methods=["POST"])
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


@notion_bp.route("/api/notion/config", methods=["GET"])
def get_notion_config():
    return jsonify({"success": True, "config": notion_service.get_config()})


@notion_bp.route("/api/notion/recent", methods=["GET"])
def get_recent_notion_items():
    default_limit = notion_service.get_config().get("widget_display_limit", 10)
    limit = request.args.get("limit", default_limit, type=int)
    items = notion_service.get_recent_items(limit=limit)
    return jsonify({"success": True, "items": items})


@notion_bp.route("/api/notion/search", methods=["GET"])
def search_notion_items():
    query = request.args.get("query", "").strip()
    if not query:
        return jsonify({"success": False, "message": "Search query is empty"}), 400

    limit = request.args.get("limit", 10, type=int)
    items = notion_service.search_items(query, limit=limit)
    return jsonify({"success": True, "items": items})


@notion_bp.route("/api/notion/brief", methods=["GET"])
def brief_notion_items():
    model = request.args.get("model", "gemini")
    config = notion_service.get_config()
    limit = config.get("briefing_limit", 5)

    # 1. 노션 최신 데이터 가져오기
    items = notion_service.get_recent_items(limit=limit)
    if not items:
        return jsonify({"success": False, "message": "No items found for briefing"})

    # 2. 프롬프트 구성
    data_list = [f"- {item['title']} (생성: {item['created_time']})" for item in items]
    data_str = "\n".join(data_list)
    prompts = load_json_config(PROMPTS_CONFIG_PATH)
    notion_prompt_template = prompts.get("NOTION_ASSISTANT", {}).get("briefing", "")

    final_prompt = notion_prompt_template.replace("{{count}}", str(len(items))).replace(
        "{{data}}", data_str
    )

    # 3. 브리핑 수행 (엔진별 분기)
    if model == "gemini":
        ai_res = query_gemini(final_prompt)
        # Gemini 서비스 응답 규격(response)을 AI Hub 규격(answer/briefing)으로 변환
        from services.ai_service import _parse_dual_response

        display, voice = _parse_dual_response(ai_res.get("response", ""))
        response_data = {
            "success": True,
            "display": display,
            "voice": voice,
            "sentiment": ai_res.get("sentiment", "neutral"),
        }
    else:
        # 외부 AI 엔진 (Grok, Ollama 등)
        ai_res = query_ai(final_prompt, source_key=model)
        if ai_res.get("status") == "success":
            response_data = {
                "success": True,
                "display": ai_res.get("answer"),
                "voice": ai_res.get("briefing"),
                "sentiment": "neutral",
            }
        else:
            return jsonify({"success": False, "message": ai_res.get("message")}), 500

    return jsonify(response_data)


@notion_bp.route("/api/notion/rules/evaluate", methods=["GET"])
def evaluate_notion_rules():
    """노션 정리 규칙에 부합하는 항목 검마 및 브리핑 생성용"""
    result = notion_service.evaluate_rules()
    return jsonify(result)


@notion_bp.route("/api/notion/rules/apply", methods=["POST"])
def apply_notion_rule():
    """특정 항목에 규칙 액션 적용 (실제 수정)"""
    data = request.json
    page_id = data.get("page_id")
    action = data.get("action")

    if not page_id or not action:
        return jsonify({"success": False, "message": "Missing page_id or action"}), 400

    success = notion_service.apply_action_to_page(page_id, action)
    return jsonify({"success": success})
