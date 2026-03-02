import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from routes.config import (
    TTS_CONFIG_PATH,
    BREF_CONFIG_PATH,
    BGM_CONFIG_PATH,
    PLUGINS_DIR,
)
from utils import (
    load_json_config,
    load_settings,
    save_settings,
)

widgets_bp = Blueprint("widgets", __name__)

# Core Config Mapping (Global)
CORE_CONFIG_MAP = {
    "tts": TTS_CONFIG_PATH,
    "bref": BREF_CONFIG_PATH,
    "bgm": BGM_CONFIG_PATH,
}


@widgets_bp.route("/config/<name>")
@login_required
def get_config(name):
    """통합 설정 로드 라우트 (Global + Plugin-X)"""
    # 1. Reactions (Dynamic Merge)
    if name == "reactions":
        from utils import load_all_reactions

        # 언어 설정을 읽기 위해 secrets 보다는 settings.json을 보는 것이 정확
        settings = load_settings()
        lang = settings.get("lang", "ko")
        return jsonify(load_all_reactions(lang))

    # 2. Core Config check
    if name in CORE_CONFIG_MAP:
        return jsonify(load_json_config(CORE_CONFIG_MAP[name]))

    # 3. [Plugin-X] 플러그인 폴더 내 config.json 자동 탐색
    # alias 매핑 (기본 키가 다른 경우 대응)
    plugin_alias = {
        "system": "system-stats",
        "ticker": "stock",
        "weather": "weather",
        "clock": "clock",
        "finance": "finance",
        "news": "news",
        "proactive": "proactive-agent",
        "notion": "notion",
        "wallpaper": "wallpaper",
        "terminal": "terminal",
    }

    target_id = plugin_alias.get(name, name)
    plugin_config_path = os.path.join(PLUGINS_DIR, target_id, "config.json")

    if os.path.exists(plugin_config_path):
        return jsonify(load_json_config(plugin_config_path))

    return jsonify({"error": f"Config '{name}' not found"}), 404


@widgets_bp.route("/get_settings")
@login_required
def get_settings():
    return jsonify(load_settings())


@widgets_bp.route("/save_settings", methods=["POST"])
@login_required
def save_settings_route():
    data = request.json
    if save_settings(data):
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 500
