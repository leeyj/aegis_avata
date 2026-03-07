from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from .ytmusic_service import yt_service
from services.plugin_registry import register_context_provider

ytmusic_plugin_bp = Blueprint("ytmusic_plugin", __name__)


def get_ytmusic_context():
    """유튜브 플러그인의 상태 및 기본 정보를 터미널 컨텍스트로 제공"""
    status = (
        "Authenticated" if yt_service.yt and yt_service.yt.auth else "Unauthenticated"
    )
    return {
        "status": status,
        "description": "유튜브 뮤직 플러그인이 활성화되어 있습니다. 음악 검색이나 플레이리스트 조회가 가능합니다.",
    }


register_context_provider(
    "youtube-music",
    get_ytmusic_context,
    aliases=["유튜브", "뮤직", "음악", "노래", "youtube"],
)


@ytmusic_plugin_bp.route("/api/plugins/youtube-music/playlists")
@login_required
def get_playlists():
    print("[MusicRoute] Requesting playlists...", flush=True)
    playlists = yt_service.get_my_playlists()
    return jsonify(playlists)


@ytmusic_plugin_bp.route("/api/plugins/youtube-music/playlist/<playlist_id>")
@login_required
def get_playlist_tracks(playlist_id):
    data = yt_service.get_playlist_tracks(playlist_id)
    if data:
        return jsonify(data)
    return jsonify({"status": "error", "message": "Failed to load playlist"}), 500


@ytmusic_plugin_bp.route("/api/plugins/youtube-music/test")
@login_required
def test_yt():
    status = (
        "Authenticated" if yt_service.yt and yt_service.yt.auth else "Unauthenticated"
    )
    return jsonify({"status": status})


@ytmusic_plugin_bp.route("/api/plugins/youtube-music/search")
@login_required
def search_music():
    query = request.args.get("q", "")
    if not query:
        return jsonify([])
    results = yt_service.search_tracks(query)
    return jsonify(results)


@ytmusic_plugin_bp.route("/api/plugins/youtube-music/auth", methods=["POST"])
@login_required
def update_auth():
    """Bookmarklet 등을 통해 전송된 인증 텍스트를 저장하고 서비스를 재시작"""
    data = request.json
    raw_auth = data.get("raw_auth", "")
    if not raw_auth:
        return jsonify({"status": "error", "message": "No auth text provided"}), 400

    success = yt_service.update_auth_text(raw_auth)
    if success:
        return jsonify(
            {
                "status": "success",
                "message": "Authentication updated and service restarted.",
            }
        )
    else:
        return jsonify(
            {"status": "error", "message": "Failed to update authentication."}
        ), 500
