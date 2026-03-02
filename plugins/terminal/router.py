import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from utils import load_json_config

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

terminal_plugin_bp = Blueprint("terminal_plugin", __name__)


@terminal_plugin_bp.route("/api/plugins/terminal/config")
@login_required
def get_terminal_config():
    config = load_json_config(CONFIG_PATH)
    return jsonify({"status": "success", "config": config})
