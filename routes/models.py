from flask import Blueprint, jsonify, send_from_directory
from routes.decorators import login_required
from routes.config import MODELS_DIR, TEST_MODELS_DIR
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


@model_bp.route("/test_models/<path:filename>")
def serve_test_model(filename):
    """[v4.0.1] Restore global test_models route for Studio compatibility"""
    return send_from_directory(TEST_MODELS_DIR, filename)
