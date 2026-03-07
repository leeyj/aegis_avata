from flask import Blueprint, jsonify, send_from_directory
from routes.decorators import login_required
from routes.config import MODELS_DIR
from utils import get_model_list, get_model_info

unit_select_plugin_bp = Blueprint("unit_select_plugin", __name__)


@unit_select_plugin_bp.route("/api/plugins/unit-select/list")
@login_required
def list_models():
    return jsonify(get_model_list(MODELS_DIR))


@unit_select_plugin_bp.route("/api/plugins/unit-select/info/<model_name>")
@login_required
def model_info(model_name):
    return jsonify(get_model_info(MODELS_DIR, model_name))


@unit_select_plugin_bp.route("/api/plugins/unit-select/files/<path:filename>")
def serve_model(filename):
    return send_from_directory(MODELS_DIR, filename)
