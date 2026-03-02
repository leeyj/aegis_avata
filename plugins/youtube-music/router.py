from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from .ytmusic_service import yt_service

ytmusic_plugin_bp = Blueprint("ytmusic_plugin", __name__)


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
