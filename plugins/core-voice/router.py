from flask import Blueprint, jsonify
from routes.decorators import login_required

core_voice_bp = Blueprint("core_voice", __name__)


def initialize_plugin():
    # 백엔드 초기화 로직 (필요 시)
    pass


@core_voice_bp.route("/api/plugins/core-voice/config", methods=["GET"])
@login_required
def get_config():
    # TTS 관련 설정을 반환하는 엔드포인트 (기존 proactive-agent 의존성 제거용)
    return jsonify(
        {"color": "rgba(255, 215, 0, 0.8)", "max_width": "500px", "font_size": "16px"}
    )
