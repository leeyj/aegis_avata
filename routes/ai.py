import os
import time
import hashlib
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from routes.config import (
    BASE_DIR,
    WEATHER_CONFIG_PATH,
    FINANCE_CONFIG_PATH,
    GEMINI_API_KEY,
    BRIEFING_TEXT_PATH,
    BRIEFING_AUDIO_PATH,
    DEBUG_MODE,
    PROACTIVE_CONFIG_PATH,
    NEWS_CONFIG_PATH,
)
from services import data_service, briefing_manager, voice_service
from utils import load_json_config, load_settings

ai_bp = Blueprint("ai", __name__)

# 서비스 초기화
data_collector = data_service.DataService(
    {
        "weather": WEATHER_CONFIG_PATH,
        "finance": FINANCE_CONFIG_PATH,
        "news": NEWS_CONFIG_PATH,
    }
)

bref_manager = briefing_manager.BriefingManager(
    api_key=GEMINI_API_KEY,
    text_cache_path=BRIEFING_TEXT_PATH,
    audio_cache_path=BRIEFING_AUDIO_PATH,
)


@ai_bp.route("/speak", methods=["POST"])
@login_required
def speak():
    data = request.json
    text = data.get("text", "")
    if not text:
        return jsonify({"status": "error", "message": "No text provided"}), 400

    # 텍스트 해시를 사용하여 고유 파일명 생성 (레이스 컨디션 방지 및 캐싱)
    text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    filename = f"tts_{text_hash}.mp3"
    cache_dir = os.path.join(BASE_DIR, "static", "audio", "tts_cache")
    os.makedirs(cache_dir, exist_ok=True)

    audio_path = os.path.join(cache_dir, filename)

    # 이미 생성된 파일이 있다면 바로 반환
    if os.path.exists(audio_path):
        return jsonify(
            {
                "status": "success",
                "url": f"/static/audio/tts_cache/{filename}",
            }
        )

    success = voice_service.generate_edge_tts(text, output_path=audio_path)

    if success:
        return jsonify(
            {
                "status": "success",
                "url": f"/static/audio/tts_cache/{filename}",
            }
        )
    return jsonify({"status": "error", "message": "TTS generation failed"}), 500


@ai_bp.route("/tactical_briefing")
@login_required
def tactical_briefing():
    settings = load_settings()
    test_mode = settings.get("test_mode", False)

    context = data_collector.collect_all_context()
    # test_mode가 True이면 Gemini 호출 없이 캐시된 마지막 브리핑을 사용
    result = bref_manager.get_briefing(context, debug_mode=(test_mode or DEBUG_MODE))
    return jsonify(result)


@ai_bp.route("/latest_briefing")
@login_required
def latest_briefing():
    """
    마지막으로 생성된 브리핑 정보를 반환 (중복 생성 방지용 캐시 우선)
    """
    settings = load_settings()
    # latest_briefing은 가급적 캐시를 사용하도록 유도 (debug_mode=True 강제 시도)
    result = bref_manager.get_briefing(
        data_collector.collect_all_context(), debug_mode=True
    )
    return jsonify(result)


@ai_bp.route("/widget_briefing/<w_type>")
@login_required
def widget_briefing(w_type):
    """
    특정 위젯(news, finance 등) 전용 브리핑 요청
    """
    context = data_collector.collect_all_context()
    widget_data = context.get(w_type)

    if not widget_data:
        return jsonify({"status": "error", "message": f"No data for {w_type}"}), 404

    result = bref_manager.get_widget_briefing(w_type, widget_data)
    return jsonify(result)


@ai_bp.route("/proactive_check")
@login_required
def proactive_check():
    """
    정기적으로 중요 트리거를 확인하고 필요 시 알림 생성
    """
    proactive_config = load_json_config(PROACTIVE_CONFIG_PATH)
    context = data_collector.collect_all_context()
    result = bref_manager.check_proactive(context, proactive_config)
    return jsonify(result)


@ai_bp.route("/command", methods=["POST"])
@login_required
def command():
    data = request.json
    cmd_text = data.get("command", "")
    if not cmd_text:
        return jsonify({"status": "error", "message": "No command provided"}), 400

    context = data_collector.collect_all_context()
    result = bref_manager.process_ai_command(cmd_text, context)
    return jsonify(result)
