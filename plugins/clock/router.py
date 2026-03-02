import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from utils import load_json_config

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

clock_plugin_bp = Blueprint("clock_plugin", __name__)


@clock_plugin_bp.route("/api/plugins/clock/config")
@login_required
def get_clock_config():
    return jsonify(load_json_config(CONFIG_PATH))
