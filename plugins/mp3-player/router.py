import os
from flask import Blueprint, jsonify, send_from_directory
from routes.decorators import login_required
from utils import load_json_config, get_plugin_i18n

mp3_plugin_bp = Blueprint("mp3_plugin", __name__)

from services.plugin_registry import register_context_provider


def get_mp3_context():
    try:
        return {"status": get_plugin_i18n("mp3-player", "views.active")}
    except Exception:
        return get_plugin_i18n("mp3-player", "views.error")


register_context_provider(
    "mp3-player", get_mp3_context, aliases=["로컬음악", "mp3", "local-music", "음악", "노래", "플레이어"]
)


def initialize_plugin():
    """MP3 Player 플러그인 초기화 및 액션 등록"""
    from services.plugin_registry import register_plugin_action

    def mp3_list_view_handler(result, platform="web", lang=None):
        if not result or not isinstance(result, list):
            return get_plugin_i18n("mp3-player", "views.error", lang=lang)
        
        lines = [f"🎵 **Local MP3 Library:**"]
        for f in result:
            lines.append(f"• {f}")
        return "\n".join(lines)

    register_plugin_action(
        plugin_id="mp3-player",
        action_id="list",
        handler=lambda: [f for f in os.listdir(get_media_dir()) if f.endswith(".mp3")],
        desc="List local MP3 files",
        args=[],
        sync_cmd="MP3_LIST_SYNC",
        view_handler=mp3_list_view_handler
    )

# 초기화 실행
initialize_plugin()


def get_media_dir():
    plugin_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(plugin_dir, "config.json")
    config = load_json_config(config_path)
    user_dir = config.get("media_directory", "")

    if user_dir and os.path.exists(user_dir):
        return user_dir
    return os.path.join(os.getcwd(), "static", "media", "mp3")


@mp3_plugin_bp.route("/api/plugins/mp3-player/media/list")
@login_required
def list_media():
    media_dir = get_media_dir()
    files = (
        [f for f in os.listdir(media_dir) if f.endswith(".mp3")]
        if os.path.exists(media_dir)
        else []
    )
    return jsonify(files)


@mp3_plugin_bp.route("/api/plugins/mp3-player/media/stream/<filename>")
@login_required
def stream_media(filename):
    media_dir = get_media_dir()
    if ".." in filename or filename.startswith("/"):
        return jsonify(
            {
                "status": "error",
                "message": get_plugin_i18n("mp3-player", "views.invalid_filename"),
            }
        ), 400
    return send_from_directory(media_dir, filename)
