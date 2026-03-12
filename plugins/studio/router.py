import os
from flask import Blueprint, jsonify, request, send_from_directory
from routes.decorators import login_required
from routes.config import TEST_MODELS_DIR
from .studio_service import StudioService


studio_plugin_bp = Blueprint("studio_plugin", __name__)

@studio_plugin_bp.route("/api/plugins/studio/models")
@login_required
def get_models():
    """테스트 모델 목록 반환"""
    return jsonify(StudioService.get_test_models())

@studio_plugin_bp.route("/api/plugins/studio/model_info/<name>")
@login_required
def get_model_info_route(name):
    """특정 테스트 모델의 상세 정보 및 alias.json 반환"""
    info = StudioService.get_test_model_info(name)
    return jsonify(info)

@studio_plugin_bp.route("/api/plugins/studio/models/<name>/<path:filename>")
@login_required
def serve_model_file(name, filename):
    """테스트 모델의 개별 파일 서빙 (PIXI.live2d 로드용)"""
    model_dir = os.path.join(TEST_MODELS_DIR, name)
    return send_from_directory(model_dir, filename)

@studio_plugin_bp.route("/api/plugins/studio/save_alias/<name>", methods=["POST"])
@login_required
def save_alias(name):
    """모델의 alias.json 저장"""
    data = request.json
    try:
        StudioService.save_alias(name, data)
        return jsonify({"status": "success", "message": "alias.json saved"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@studio_plugin_bp.route("/api/plugins/studio/apply_model/<name>", methods=["POST"])
@login_required
def apply_model(name):
    """테스트 모델을 실운영으로 배포"""
    try:
        StudioService.apply_model(name)
        return jsonify({"status": "success", "message": f"Model '{name}' applied to AEGIS successfully."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@studio_plugin_bp.route("/api/plugins/studio/fix_model/<name>", methods=["POST"])
@login_required
def fix_model(name):
    """테스트 모델 자동 수정"""
    try:
        stats = StudioService.fix_model(name)
        return jsonify(stats)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@studio_plugin_bp.route("/api/plugins/studio/reactions")
@login_required
def get_reactions():
    """전체 리액션 데이터 반환"""
    return jsonify(StudioService.get_reactions())
