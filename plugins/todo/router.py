import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from .todo_service import get_today_tasks, add_task, complete_task
from utils import load_json_config
from services import require_permission
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

todo_plugin_bp = Blueprint("todo_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_todo_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    res = get_today_tasks()
    if isinstance(res, dict) and res.get("status") == "SUCCESS":
        return res.get("tasks", [])
    return []


register_context_provider("todo", get_todo_context)


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
