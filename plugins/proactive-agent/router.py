import os
import hashlib
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from routes.config import (
    BASE_DIR,
    PLUGINS_DIR,
    GEMINI_API_KEY,
    BRIEFING_TEXT_PATH,
    BRIEFING_AUDIO_PATH,
    TTS_CONFIG_PATH,
    BREF_CONFIG_PATH,
)
from services import data_service, briefing_manager, voice_service, require_permission
from utils import load_json_config

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

proactive_plugin_bp = Blueprint("proactive_plugin", __name__)

# 서비스 초기화 (공유 서비스 사용)
data_collector = data_service.DataService(
    {
        "weather": os.path.join(PLUGINS_DIR, "weather", "config.json"),
        "finance": os.path.join(PLUGINS_DIR, "finance", "config.json"),
        "news": os.path.join(PLUGINS_DIR, "news", "config.json"),
    }
)

bref_manager = briefing_manager.BriefingManager(
    api_key=GEMINI_API_KEY,
    text_cache_path=BRIEFING_TEXT_PATH,
    audio_cache_path=BRIEFING_AUDIO_PATH,
)


@proactive_plugin_bp.route("/api/plugins/proactive-agent/config")
@login_required
def get_proactive_config():
    return jsonify(load_json_config(CONFIG_PATH))


@proactive_plugin_bp.route("/api/plugins/proactive-agent/briefing/tactical")
@login_required
@require_permission("api.ai_agent")
def tactical_briefing():
    from utils import load_settings
    from routes.config import DEBUG_MODE

    settings = load_settings()
    test_mode = settings.get("test_mode", False)
    context = data_collector.collect_all_context()
    result = bref_manager.get_briefing(context, debug_mode=(test_mode or DEBUG_MODE))
    return jsonify(result)


@proactive_plugin_bp.route("/api/plugins/proactive-agent/briefing/widget/<w_type>")
@login_required
@require_permission("api.ai_agent")
def widget_briefing(w_type):
    context = data_collector.collect_all_context()
    widget_data = context.get(w_type)
    if not widget_data:
        return jsonify({"status": "error", "message": f"No data for {w_type}"}), 404
    result = bref_manager.get_widget_briefing(w_type, widget_data)
    return jsonify(result)


@proactive_plugin_bp.route("/api/plugins/proactive-agent/check")
@login_required
@require_permission("api.ai_agent")
def proactive_check():
    proactive_config = load_json_config(CONFIG_PATH)
    context = data_collector.collect_all_context()
    result = bref_manager.check_proactive(context, proactive_config)
    return jsonify(result)


@proactive_plugin_bp.route("/api/plugins/proactive-agent/briefing/latest")
@login_required
def latest_briefing():
    result = bref_manager.get_briefing(
        data_collector.collect_all_context(), debug_mode=True
    )
    return jsonify(result)


@proactive_plugin_bp.route("/api/plugins/proactive-agent/command", methods=["POST"])
@login_required
@require_permission("api.ai_agent")
def command():
    data = request.json
    cmd_text = data.get("command", "")
    if not cmd_text:
        return jsonify({"status": "error", "message": "No command provided"}), 400

    context = data_collector.collect_all_context()
    result = bref_manager.process_ai_command(cmd_text, context)
    return jsonify(result)


@proactive_plugin_bp.route("/api/plugins/proactive-agent/speak", methods=["POST"])
@login_required
@require_permission("api.voice_service")
def speak():
    data = request.json
    text = data.get("text", "")
    if not text:
        return jsonify({"status": "error", "message": "No text provided"}), 400

    text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    filename = f"tts_{text_hash}.mp3"
    cache_dir = os.path.join(BASE_DIR, "static", "audio", "tts_cache")
    os.makedirs(cache_dir, exist_ok=True)

    audio_path = os.path.join(cache_dir, filename)

    if os.path.exists(audio_path):
        return jsonify(
            {"status": "success", "url": f"/static/audio/tts_cache/{filename}"}
        )

    success = voice_service.generate_edge_tts(text, output_path=audio_path)
    if success:
        return jsonify(
            {"status": "success", "url": f"/static/audio/tts_cache/{filename}"}
        )
    return jsonify({"status": "error", "message": "TTS generation failed"}), 500


@proactive_plugin_bp.route("/api/plugins/proactive-agent/config/tts")
@login_required
def tts_config():
    return jsonify(load_json_config(TTS_CONFIG_PATH))


@proactive_plugin_bp.route("/api/plugins/proactive-agent/config/briefing")
@login_required
def briefing_config():
    return jsonify(load_json_config(BREF_CONFIG_PATH))
