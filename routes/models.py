from flask import Blueprint, jsonify, send_from_directory
from routes.decorators import login_required
from routes.config import MODELS_DIR
from utils import get_model_list, get_model_info

model_bp = Blueprint("models", __name__)


@model_bp.route("/list_models")
@login_required
def list_models():
    return jsonify(get_model_list(MODELS_DIR))


@model_bp.route("/model_info/<model_name>")
@login_required
def model_info(model_name):
    return jsonify(get_model_info(MODELS_DIR, model_name))


@model_bp.route("/models/<path:filename>")
def serve_model(filename):
    return send_from_directory(MODELS_DIR, filename)
