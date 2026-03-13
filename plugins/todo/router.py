import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from .todo_service import get_today_tasks, add_task, complete_task
from utils import load_json_config, get_plugin_i18n
from services import require_permission
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

todo_plugin_bp = Blueprint("todo_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_todo_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API (기본)"""
    res = get_today_tasks()
    if isinstance(res, dict):
        if res.get("status") == "SUCCESS":
            return res.get("tasks", [])
        elif res.get("status") == "AUTH_REQUIRED":
            return False, f"⚠️ {res.get('message', 'Authentication required')}"
        else:
            return False, f"❌ {res.get('message', 'Unknown error')}"
    return []


def get_todo_ai_context():
    """AI를 위한 데이터 정제 버전 (ID 제거)"""
    tasks = get_todo_context()
    if isinstance(tasks, list):
        return [
            {"title": t["title"], "notes": t.get("notes", ""), "due": t.get("due", "")}
            for t in tasks
        ]
    return []


def initialize_plugin():
    """할 일 플러그인 초기화 및 BotManager 액션 등록 (Systemic v3.6.0)"""
    from services.plugin_registry import register_plugin_action

    # 1. ADD 등록
    def add_todo_handler(title, notes=""):
        res = add_task(title)
        return res.get("status") == "SUCCESS"

    register_plugin_action(
        plugin_id="todo",
        action_id="add",
        handler=add_todo_handler,
        desc=get_plugin_i18n("todo", "actions.add.desc"),
        args=get_plugin_i18n("todo", "actions.add.args"),
        sync_cmd="TODO_SYNC",
    )

    # 2. DONE 등록
    def done_todo_handler(title):
        title_to_find = title.strip().lower()
        tasks = get_todo_context()
        if isinstance(tasks, list):
            for t in tasks:
                if title_to_find in t["title"].lower():
                    res = complete_task(t["tasklist_id"], t["id"])
                    return res.get("status") == "SUCCESS"
        return False

    register_plugin_action(
        plugin_id="todo",
        action_id="done",
        handler=done_todo_handler,
        desc=get_plugin_i18n("todo", "actions.done.desc"),
        args=get_plugin_i18n("todo", "actions.done.args"),
        sync_cmd="TODO_SYNC",
    )

    # 3. LIST 등록
    def todo_list_view_handler(result, platform="web", lang=None):
        if not result:
            return get_plugin_i18n("todo", "views.empty", lang=lang)

        bullet = "-" if platform == "discord" else "•"
        lines = []
        for t in result:
            title = t.get("title", get_plugin_i18n("todo", "views.unknown", lang=lang))
            due = t.get("due")
            line = f"{bullet} {title}"
            if due:
                line += f" ({due})"
            lines.append(line)
        return "\n".join(lines)

    register_plugin_action(
        plugin_id="todo",
        action_id="list",
        handler=get_todo_context,
        desc=get_plugin_i18n("todo", "actions.list.desc"),
        args=get_plugin_i18n("todo", "actions.list.args"),
        sync_cmd="TODO_LIST_SYNC",
        view_handler=todo_list_view_handler,
    )


register_context_provider(
    "todo",
    get_todo_context,
    ai_processor=get_todo_ai_context,
    aliases=["할일", "태스크"],
)

# 플러그인 로드 시 초기화 실행
initialize_plugin()


@todo_plugin_bp.route("/api/plugins/todo/list")
@login_required
@require_permission("api.google_suite")
def get_todo_list():
    return jsonify(get_today_tasks())


@todo_plugin_bp.route("/api/plugins/todo/add", methods=["POST"])
@login_required
@require_permission("api.google_suite")
def add_todo():
    title = request.json.get("title")
    if not title:
        return jsonify({"status": "error", "message": "Title is required"}), 400
    return jsonify(add_task(title))


@todo_plugin_bp.route("/api/plugins/todo/complete", methods=["POST"])
@login_required
@require_permission("api.google_suite")
def complete_todo():
    tasklist_id = request.json.get("tasklist_id")
    task_id = request.json.get("task_id")
    if not tasklist_id or not task_id:
        return jsonify(
            {"status": "error", "message": "Tasklist and Task ID are required"}
        ), 400
    return jsonify(complete_task(tasklist_id, task_id))


@todo_plugin_bp.route("/api/plugins/todo/config")
@login_required
def get_todo_config():
    return jsonify(load_json_config(CONFIG_PATH))
