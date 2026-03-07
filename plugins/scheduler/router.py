import os
import shutil
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from utils import load_json_config, save_json_config, is_sponsor
from services import require_permission

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
PLUGINS_ROOT = os.path.dirname(PLUGIN_DIR)  # /plugins 전체
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

scheduler_plugin_bp = Blueprint("scheduler_plugin", __name__)

from services.plugin_registry import register_context_provider


def get_scheduler_context():
    """예약된 루틴 및 스케줄러 설정 반환"""
    config = load_json_config(CONFIG_PATH)
    routines = config.get("routines", [])
    if routines:
        routine_names = [f"{r['name']}({r['time']} 실행)" for r in routines]
        return f"현재 {len(routines)}개의 예약된 루틴이 있습니다: {', '.join(routine_names)}"
    return "현재 등록된 예약 루틴이 없습니다."


register_context_provider(
    "scheduler", get_scheduler_context, aliases=["루틴", "스케줄러", "예약"]
)


@scheduler_plugin_bp.route("/api/plugins/scheduler/exports")
@login_required
def get_all_exports():
    """모든 플러그인의 manifest.json에서 exports(sensors, commands, actions)를 수집"""
    sensors = []
    commands = []
    actions = []

    try:
        if not os.path.exists(PLUGINS_ROOT):
            return jsonify({"sensors": [], "commands": [], "actions": []})

        for plugin_name in os.listdir(PLUGINS_ROOT):
            manifest_path = os.path.join(PLUGINS_ROOT, plugin_name, "manifest.json")
            if not os.path.isfile(manifest_path):
                continue

            manifest = load_json_config(manifest_path)
            exports = manifest.get("exports", {})
            plugin_id = manifest.get("id", plugin_name)
            plugin_display = manifest.get("name", plugin_id)

            # 센서 수집
            for sensor in exports.get("sensors", []):
                sensors.append(
                    {
                        "plugin_id": plugin_id,
                        "plugin_name": plugin_display,
                        "sensor_id": sensor.get("id"),
                        "name": sensor.get("name"),
                        "unit": sensor.get("unit", ""),
                        "type": sensor.get("type", "number"),
                        "endpoint": sensor.get("endpoint"),
                        "field": sensor.get("field"),
                    }
                )

            # 명령어 수집
            for cmd in exports.get("commands", []):
                commands.append(
                    {
                        "plugin_id": plugin_id,
                        "plugin_name": plugin_display,
                        "prefix": cmd.get("prefix"),
                        "name": cmd.get("name"),
                        "examples": cmd.get("examples", []),
                    }
                )

            # [NEW] 액션 수집 (v2.0)
            for action in exports.get("actions", []):
                actions.append(
                    {
                        "plugin_id": plugin_id,
                        "plugin_name": plugin_display,
                        "id": action.get("id"),
                        "name": action.get("name"),
                        "description": action.get("description", ""),
                        "type": action.get(
                            "type", "terminal_command"
                        ),  # terminal_command or api_call
                        "payload": action.get(
                            "payload"
                        ),  # { "command": "..." } or { "url": "..." }
                    }
                )
    except Exception as e:
        return jsonify({"sensors": [], "commands": [], "actions": [], "error": str(e)})

    return jsonify({"sensors": sensors, "commands": commands, "actions": actions})


@scheduler_plugin_bp.route("/api/plugins/scheduler/config")
@login_required
def get_scheduler_config():
    return jsonify(load_json_config(CONFIG_PATH))


@scheduler_plugin_bp.route("/api/plugins/scheduler/save", methods=["POST"])
@login_required
@require_permission("api.io_control")
def save_scheduler_config():
    data = request.json
    if not data or "routines" not in data:
        return jsonify({"status": "error", "message": "Invalid scheduler data"}), 400

    routines = data.get("routines", [])
    sponsor_status = is_sponsor()

    for r in routines:
        if not all(k in r for k in ("id", "name", "time", "action", "days")):
            return jsonify(
                {"status": "error", "message": "Missing required fields"}
            ), 400

        premium_actions = ["yt_play", "yt_stop", "yt_volume", "wallpaper_set"]
        if r.get("action") in premium_actions and not sponsor_status:
            return jsonify(
                {
                    "status": "error",
                    "message": "Premium Action requires Sponsor account",
                }
            ), 403

    try:
        if os.path.exists(CONFIG_PATH):
            backup_path = CONFIG_PATH + ".bak"
            shutil.copy2(CONFIG_PATH, backup_path)

        if save_json_config(CONFIG_PATH, data, merge=False):
            return jsonify({"status": "success", "message": "Scheduler config saved"})
        return jsonify({"status": "error", "message": "Failed to write config"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
