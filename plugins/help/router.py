import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from services.plugin_registry import get_action_help_info, get_context_aliases
from services.bot_intelligence import has_plugin_ai_prompt

help_plugin_bp = Blueprint("help_plugin", __name__)


@help_plugin_bp.route("/api/plugins/help/data")
@login_required
def get_help_data():
    """도움말 위젯에서 사용할 통합 플러그인 정보 반환"""
    actions = get_action_help_info()
    aliases_map = get_context_aliases()

    # 플러그인별 정보 재구성
    plugins_info = {}

    # 1. 액션 기반 정보 수집
    for key, data in actions.items():
        plugin_id = data.get("plugin_id")
        if not plugin_id:
            continue

        if plugin_id not in plugins_info:
            plugins_info[plugin_id] = {
                "id": plugin_id,
                "actions": [],
                "aliases": [],
                "support_systematic": True,
                "support_hybrid": has_plugin_ai_prompt(plugin_id),
            }

        action_id = key.split("_", 1)[1] if "_" in key else key
        plugins_info[plugin_id]["actions"].append(
            {"id": action_id, "desc": data.get("desc"), "args": data.get("args")}
        )

    # 2. 알리아스 정보 통합
    for alias, pid in aliases_map.items():
        if pid not in plugins_info:
            if pid != alias:
                # 액션은 없지만 컨텍스트만 있는 경우
                plugins_info[pid] = {
                    "id": pid,
                    "actions": [],
                    "aliases": [alias],
                    "support_systematic": False,
                    "support_hybrid": has_plugin_ai_prompt(pid),
                }
            continue

        if alias not in plugins_info[pid]["aliases"]:
            plugins_info[pid]["aliases"].append(alias)

    from utils import get_i18n, load_settings

    lang = load_settings().get("lang", "ko")

    # i18n 라벨 포함 (하드코딩 방지)
    labels = {
        "loading": get_i18n("help_center.loading", lang),
        "error": get_i18n("help_center.error", lang),
        "status": get_i18n("help_center.status", lang),
        "no_data": get_i18n("help_center.no_data", lang),
        "actions": get_i18n("help_center.actions", lang),
        "aliases": get_i18n("help_center.aliases", lang),
        "doc_not_found": get_i18n("help_center.doc_not_found", lang),
    }

    return jsonify(
        {"status": "success", "plugins": list(plugins_info.values()), "labels": labels}
    )


@help_plugin_bp.route("/api/plugins/help/doc/<doc_name>")
@login_required
def get_help_doc(doc_name):
    """지정된 마크다운 문서 내용을 반환 (다국어 지원)"""
    # 보안: 파일명 제한 (영문, 숫자, 하이픈, 언더바)
    doc_name = doc_name.replace("..", "").replace("/", "").replace("\\", "")

    from utils import load_settings

    settings = load_settings()
    lang = settings.get("lang", "ko")

    # 순서: 1. 언어 폴더, 2. 한국어(기본), 3. 루트(하위 호환)
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "docs", lang, f"{doc_name}.md"),
        os.path.join(os.path.dirname(__file__), "docs", "ko", f"{doc_name}.md"),
        os.path.join(os.path.dirname(__file__), "docs", f"{doc_name}.md"),
    ]

    doc_path = None
    for path in possible_paths:
        if os.path.exists(path):
            doc_path = path
            break

    if not doc_path:
        return jsonify({"status": "error", "message": "Document not found"}), 404

    try:
        with open(doc_path, "r", encoding="utf-8") as f:
            content = f.read()
        return jsonify({"status": "success", "content": content})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@help_plugin_bp.route("/api/plugins/help/docs")
@login_required
def list_help_docs():
    """사용 가능한 마크다운 문서 목록 반환 (다국어 지원)"""
    from utils import load_settings

    settings = load_settings()
    lang = settings.get("lang", "ko")

    docs_dir = os.path.join(os.path.dirname(__file__), "docs", lang)
    if not os.path.exists(docs_dir):
        docs_dir = os.path.join(os.path.dirname(__file__), "docs", "ko")

    if not os.path.exists(docs_dir):
        return jsonify({"status": "success", "docs": []})

    try:
        files = [
            f.replace(".md", "")
            for f in os.listdir(docs_dir)
            if f.endswith(".md") and f != "ai_prompt.md"
        ]
        return jsonify({"status": "success", "docs": sorted(files)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


def initialize_plugin():
    from services.plugin_registry import register_plugin_action
    from utils import get_i18n, load_settings

    lang = load_settings().get("lang", "ko")

    register_plugin_action(
        plugin_id="help",
        action_id="summary",
        handler=lambda: {
            "status": "SUCCESS",
            "message": get_i18n("bot.action_success", lang),
        },
        desc=get_i18n("help_center.status", lang),
        sync_cmd="HELP_CENTER_SYNC",
    )


initialize_plugin()
