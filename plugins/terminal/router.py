import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required, standardized_plugin_response
from utils import load_json_config, get_plugin_i18n

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

terminal_plugin_bp = Blueprint("terminal_plugin", __name__)


def initialize_plugin():
    """터미널 플러그인 초기화 및 액션 등록"""
    from services.plugin_registry import register_plugin_action
    import subprocess

    # 1. RUN 등록
    def terminal_run_view_handler(result, platform="web", lang=None):
        if not result or result.get("status") == "error":
            prefix = get_plugin_i18n("terminal", "views.error_prefix", lang=lang)
            msg = result.get(
                "message", get_plugin_i18n("terminal", "views.unknown_error", lang=lang)
            )
            return f"{prefix}{msg}"

        stdout = result.get("stdout", "").strip()
        stderr = result.get("stderr", "").strip()
        code = result.get("returncode", 0)

        output = []
        if stdout:
            output.append(f"```\n{stdout}\n```")
        if stderr:
            label = get_plugin_i18n("terminal", "views.stderr_label", lang=lang)
            output.append(f"{label}\n```\n{stderr}\n```")

        if not output:
            fmt = get_plugin_i18n("terminal", "views.exit_code_format", lang=lang)
            return fmt.format(code=code)

        return "\n".join(output)

    from .terminal_service import run_command_handler

    register_plugin_action(
        plugin_id="terminal",
        action_id="run",
        handler=run_command_handler,
        desc=get_plugin_i18n("terminal", "actions.run.desc"),
        args=get_plugin_i18n("terminal", "actions.run.args"),
        sync_cmd="TERMINAL_RUN_SYNC",
        view_handler=terminal_run_view_handler,
    )


# 플러그인 로드 시 초기화 실행
initialize_plugin()


@terminal_plugin_bp.route("/api/plugins/terminal/config")
@login_required
@standardized_plugin_response
def get_terminal_config():
    config = load_json_config(CONFIG_PATH)
    return jsonify({"status": "success", "config": config})


@terminal_plugin_bp.route("/api/plugins/terminal/save", methods=["POST"])
@login_required
@standardized_plugin_response
def save_terminal_config():
    from utils import save_json_config

    data = request.json
    if save_json_config(CONFIG_PATH, data, merge=True):
        return jsonify({"status": "success", "message": "Terminal config saved"})
    return jsonify({"status": "error", "message": "Failed to save config"}), 500
