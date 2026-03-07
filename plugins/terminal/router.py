import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required, standardized_plugin_response
from utils import load_json_config

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

terminal_plugin_bp = Blueprint("terminal_plugin", __name__)


# ─────────────────────────────────────────────
# [v2.7.0] Intent Router: 접두사 기반 라우팅 레이어
#   (이제 이 기능은 routes/plugin_proxies.py 내 AI Gateway 일반 시스템으로 이관됨)
# ─────────────────────────────────────────────


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
