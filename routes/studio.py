from flask import Blueprint, render_template, jsonify, request, send_from_directory
from routes.decorators import login_required
from utils import is_sponsor
from services.studio_service import StudioService
from routes.config import TEST_MODELS_DIR

studio_bp = Blueprint("studio", __name__)


@studio_bp.route("/studio")
@login_required
def studio_index():
    if not is_sponsor():
        from flask import abort

        abort(403)

    from utils import load_settings

    settings = load_settings()
    return render_template(
        "studio/index.html", settings=settings, is_sponsor=is_sponsor()
    )


@studio_bp.route("/studio/api/models")
@login_required
def list_studio_models():
    return jsonify(StudioService.get_test_models())


@studio_bp.route("/studio/api/model_info/<name>")
@login_required
def studio_model_info(name):
    return jsonify(StudioService.get_test_model_info(name))


@studio_bp.route("/studio/api/save_alias/<name>", methods=["POST"])
@login_required
def studio_save_alias(name):
    if not is_sponsor():
        return jsonify({"status": "error", "message": "Unauthorized"}), 403
    try:
        StudioService.save_alias(name, request.json)
        return jsonify(
            {"status": "success", "message": "alias.json saved successfully"}
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@studio_bp.route("/studio/api/apply_model/<name>", methods=["POST"])
@login_required
def studio_apply_model(name):
    if not is_sponsor():
        return jsonify({"status": "error", "message": "Unauthorized"}), 403
    try:
        StudioService.apply_model(name)
        return jsonify(
            {"status": "success", "message": f"Model '{name}' applied successfully!"}
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@studio_bp.route("/studio/api/reactions")
@login_required
def studio_get_reactions():
    return jsonify(StudioService.get_reactions())


@studio_bp.route("/studio/models/<path:filename>")
def serve_studio_models(filename):
    return send_from_directory(TEST_MODELS_DIR, filename)
