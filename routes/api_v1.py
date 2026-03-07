import os
import uuid
import hashlib
from flask import Blueprint, request, jsonify
from routes.config import SECRETS_CONFIG_PATH
from services import ai_service, voice_service
from utils import load_json_config
import time

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
    외부 시스템으로부터 아바타 제어 명령을 수신하여 큐에 저장합니다.
    """
    api_key = request.headers.get("X-AEGIS-API-KEY")
    source = validate_api_key(api_key)

    if not source:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    payload = request.json
    command = payload.get("command", "speak")

    # 이벤트 객체 생성
    event_id = str(uuid.uuid4().hex)
    audio_url = payload.get("payload", {}).get("audio_url")
    text = payload.get("payload", {}).get("text", "")
    motion = payload.get("payload", {}).get("motion", "idle")

    # 만약 음성 파일이 없고 텍스트만 있다면 서버사이드 TTS 생성 시도 (모듈화된 서비스 이용)
    if not audio_url and text:
        audio_url = voice_service.generate_cached_tts(text, prefix=source)

    event = {
        "id": event_id,
        "source": source,
        "command": command,
        "text": text,
        "motion": motion,
        "audio_url": audio_url,
        "interrupt": payload.get("payload", {}).get("interrupt", False),
        "timestamp": time.time(),
    }

    external_events_queue.append(event)

    # 큐 크기 관리 (최근 50개 유지)
    if len(external_events_queue) > 50:
        external_events_queue.pop(0)

    return jsonify({"status": "success", "event_id": event_id})


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

    # ai_service 호출 (answer: 터미널용, briefing: 음성용이 분리되어 반환됨)
    ai_result = ai_service.query_ai(prompt, source_key=source)

    if ai_result["status"] == "error":
        return jsonify(ai_result), 500

    display_answer = ai_result.get("answer", "")
    voice_briefing = ai_result.get("briefing", "")

    # 음성 파일 생성 (모듈화된 서비스 이용)
    audio_url = voice_service.generate_cached_tts(
        voice_briefing, prefix=f"query_{source}"
    )

    # 이벤트 큐 삽입
    event_id = str(uuid.uuid4().hex)
    event = {
        "id": event_id,
        "source": source,
        "command": "speak",
        "text": voice_briefing,  # 아바타가 읽을 텍스트
        "display_text": display_answer,  # 화면에 남길 텍스트 (옵션)
        "motion": "joy"
        if any(k in prompt for k in ["안녕", "반가워", "고마워"])
        else "idle",
        "audio_url": audio_url,
        "interrupt": True,
        "timestamp": time.time(),
    }
    external_events_queue.append(event)

    return jsonify(
        {
            "status": "success",
            "answer": display_answer,  # 터미널에 표시될 데이터
            "briefing": voice_briefing,  # 음성으로 출력될 데이터 (참조용)
            "model": ai_result.get("model"),
            "event_id": event_id,
        }
    )
