import os
import hashlib
import json
from flask import Blueprint, jsonify, request
from routes.decorators import login_required, standardized_plugin_response
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


@proactive_plugin_bp.route(
    "/api/plugins/proactive-agent/config", methods=["GET", "POST"]
)
@login_required
@standardized_plugin_response
def handle_proactive_config():
    if request.method == "POST":
        data = request.json
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400

        current_config = load_json_config(CONFIG_PATH)
        current_config.update(data)

        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(current_config, f, ensure_ascii=False, indent=4)

        return jsonify({"status": "success", "config": current_config})

    return jsonify(load_json_config(CONFIG_PATH))


@proactive_plugin_bp.route("/api/plugins/proactive-agent/briefing/tactical")
@login_required
@standardized_plugin_response
@require_permission("api.ai_agent")
def tactical_briefing():
    from utils import load_settings
    from routes.config import DEBUG_MODE

    print("\n" + "=" * 50)
    print("[ProactiveAgent] >>> TACTICAL BRIEFING REQUESTED")

    settings = load_settings()
    test_mode = settings.get("test_mode", False)

    print(
        f"[ProactiveAgent] Collecting context data... (TestMode: {test_mode}, Debug: {DEBUG_MODE})"
    )

    # 1. 브리핑 설정 로드 (사용자가 선택한 위젯 리스트)
    config = load_json_config(CONFIG_PATH)
    briefing_widgets = config.get("briefing_widgets", [])

    # 2. 데이터 수집 (필터링 적용)
    # 선택된 위젯이 있으면 해당 항목만 수집
    filter_ids = briefing_widgets if briefing_widgets else None

    print(f"[ProactiveAgent] Filtering context for: {filter_ids}")
    context = data_collector.collect_all_context(plugin_ids=filter_ids)

    print(f"[ProactiveAgent] Context collected: {list(context.keys())}")
    result = bref_manager.get_briefing(context, debug_mode=(test_mode or DEBUG_MODE))

    print("[ProactiveAgent] Briefing generation complete.")
    print("=" * 50 + "\n")
    return jsonify(result)


@proactive_plugin_bp.route("/api/plugins/proactive-agent/briefing/widget/<w_type>")
@login_required
@standardized_plugin_response
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
@standardized_plugin_response
@require_permission("api.ai_agent")
def proactive_check():
    proactive_config = load_json_config(CONFIG_PATH)
    context = data_collector.collect_all_context()
    result = bref_manager.check_proactive(context, proactive_config)
    return jsonify(result)


@proactive_plugin_bp.route("/api/plugins/proactive-agent/briefing/latest")
@login_required
@standardized_plugin_response
def latest_briefing():
    result = bref_manager.get_briefing(
        data_collector.collect_all_context(), debug_mode=True
    )
    return jsonify(result)


@proactive_plugin_bp.route("/api/plugins/proactive-agent/command", methods=["POST"])
@login_required
@standardized_plugin_response
@require_permission("api.ai_agent")
def command():
    data = request.json
    cmd_text = data.get("command", "")
    if not cmd_text:
        return jsonify({"status": "error", "message": "No command provided"}), 400

    context = data_collector.collect_all_context()
    source_key = data.get("source_key", "gemini")
    result = bref_manager.process_ai_command(cmd_text, context, source_key=source_key)
    return jsonify(result)


@proactive_plugin_bp.route("/api/plugins/proactive-agent/speak", methods=["POST"])
@login_required
@standardized_plugin_response
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
