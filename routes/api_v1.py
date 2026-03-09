import os
import hashlib
from flask import Blueprint, request, jsonify
from routes.config import SECRETS_CONFIG_PATH
from utils import load_json_config

api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1/external")

# 이벤트 큐 (메모리에 임시 저장, 실제 운영 환경에서는 Redis 등이 권장됨)
external_events_queue = []

# 프로젝트 루트 디렉토리 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def validate_api_key(api_key):
    """
    secrets.json에 정의된 EXTERNAL_API_KEYS를 기준으로 인증을 수행합니다.
    """
    secrets = load_json_config(SECRETS_CONFIG_PATH)
    keys = secrets.get("EXTERNAL_API_KEYS", {})
    # 키 값이 일치하는 서비스 이름을 반환
    for source, key in keys.items():
        if key == api_key:
            return source
    return None


@api_v1_bp.route("/config", methods=["GET"])
def get_external_config():
    """
    프론트엔드에서 사용 가능한 AI 모델 설정을 조회합니다.
    """
    from routes.config import API_CONFIG_PATH

    config = load_json_config(API_CONFIG_PATH)
    return jsonify({"status": "success", "config": config})


@api_v1_bp.route("/interact", methods=["POST"])
def interact():
    """
    외부 시스템으로부터 아바타 제어 명령을 수신합니다. (v3.8.0 통합 라우팅 적용)
    """
    api_key = request.headers.get("X-AEGIS-API-KEY")
    source = validate_api_key(api_key)

    if not source:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    payload = request.json
    text = payload.get("payload", {}).get("text", "")

    from services.bot_gateway import bot_manager

    result = bot_manager.handle_incoming_message(
        platform=source, user_id=source, text=text, target_id="HUD"
    )

    return jsonify({"status": "success", "answer": result.get("text")})


@api_v1_bp.route("/events", methods=["GET"])
def get_events():
    """
    ExternalAPIManager(JS)가 폴링하여 새로운 이벤트를 가져가는 엔드포인트입니다.
    """
    return jsonify({"status": "success", "events": list(external_events_queue)})


@api_v1_bp.route("/query", methods=["POST"])
def query():
    """
    사용자 질문을 AI에게 전달하고, 화면용(answer)과 음성용(briefing)을 분리하여 처리합니다.
    """
    api_key = request.headers.get("X-AEGIS-API-KEY")
    source = validate_api_key(api_key)

    if not source:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    data = request.json
    prompt = data.get("prompt")
    if not prompt:
        return jsonify({"status": "error", "message": "No prompt provided"}), 400

    # [v3.8.0] BotManager를 통한 통합 메시지 처리 (Web/CLI/Discord 일원화)
    from services.bot_gateway import bot_manager

    result = bot_manager.handle_incoming_message(
        platform=source,  # 외부 앱 소스명을 플랫폼으로 처리
        user_id=source,
        text=prompt,
        target_id="HUD",  # HUD 전용 채널 ID (가상)
        model=data.get("model", "gemini"),
    )

    display_answer = result.get("text", "")
    # briefing은 BotManager -> IntelligenceHub 내에서 이미 TTS 생성 및 HUD 전송됨.
    # api_v1은 터미널 응답만 반환하면 됨.

    return jsonify(
        {
            "status": "success",
            "answer": display_answer,  # 터미널에 표시될 데이터
            "model": result.get("model", "gemini"),
        }
    )
