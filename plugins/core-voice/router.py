from flask import Blueprint, jsonify
from routes.decorators import login_required

core_voice_bp = Blueprint("core_voice", __name__)


def initialize_plugin():
    # 백엔드 초기화 로직 (필요 시)
    pass


@core_voice_bp.route("/api/plugins/core-voice/config", methods=["GET"])
@login_required
def get_config():
    # TTS 관련 설정을 반환하는 엔드포인트
    return jsonify(
        {"color": "rgba(255, 215, 0, 0.8)", "max_width": "500px", "font_size": "16px"}
    )


@core_voice_bp.route("/api/plugins/core-voice/tts", methods=["GET"])
@login_required
def get_tts():
    """
    텍스트를 받아서 TTS 캐시 파일로 리다이렉트합니다.
    """
    from flask import request, redirect
    from services.voice_service import generate_cached_tts

    text = request.args.get("text", "")
    if not text:
        return "No text provided", 400

    url = generate_cached_tts(text)
    if url:
        return redirect(url)
    return "TTS Generation Failed", 500
