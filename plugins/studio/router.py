from flask import Blueprint, render_template, jsonify, request, send_from_directory
from routes.decorators import login_required
from utils import is_sponsor, get_plugin_i18n
from .studio_service import StudioService
from services import require_permission
from routes.config import TEST_MODELS_DIR

studio_plugin_bp = Blueprint("studio_plugin", __name__)


@studio_plugin_bp.route("/studio")
@login_required
def studio_index():
    from utils import load_settings, is_sponsor

    settings = load_settings()
    return render_template("studio/index.html", settings=settings)


@studio_plugin_bp.route("/api/plugins/studio/models")
@login_required
@require_permission("api.studio_service")
def list_studio_models():
    return jsonify(StudioService.get_test_models())


@studio_plugin_bp.route("/api/plugins/studio/model_info/<name>")
@login_required
@require_permission("api.studio_service")
def studio_model_info(name):
    return jsonify(StudioService.get_test_model_info(name))


@studio_plugin_bp.route("/api/plugins/studio/save_alias/<name>", methods=["POST"])
@login_required
@require_permission("api.studio_service")
def studio_save_alias(name):
    try:
        StudioService.save_alias(name, request.json)
        return jsonify(
            {
                "status": "success",
                "message": get_plugin_i18n("studio", "studio.messages.alias_saved"),
            }
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@studio_plugin_bp.route("/api/plugins/studio/apply_model/<name>", methods=["POST"])
@login_required
@require_permission("api.studio_service")
def studio_apply_model(name):
    if not is_sponsor():
        return jsonify({"status": "error", "message": "Unauthorized"}), 403
    try:
        StudioService.apply_model(name)
        msg = get_plugin_i18n("studio", "studio.messages.model_applied")
        return jsonify({"status": "success", "message": msg.format(name=name)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@studio_plugin_bp.route("/api/plugins/studio/fix_model/<name>", methods=["POST"])
@login_required
@require_permission("api.studio_service")
def studio_fix_model(name):
    if not is_sponsor():
        return jsonify({"status": "error", "message": "Unauthorized"}), 403
    try:
        stats = StudioService.fix_model(name)
        return jsonify(stats)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@studio_plugin_bp.route("/api/plugins/studio/reactions")
@login_required
@require_permission("api.studio_service")
def studio_get_reactions():
    return jsonify(StudioService.get_reactions())


@studio_plugin_bp.route("/api/plugins/studio/models/<path:filename>")
def serve_studio_models(filename):
    return send_from_directory(TEST_MODELS_DIR, filename)
