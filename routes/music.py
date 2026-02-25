from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from services.ytmusic_service import yt_service

music_bp = Blueprint("music", __name__)


@music_bp.route("/yt/playlists")
@login_required
def get_playlists():
    print("[MusicRoute] Requesting playlists...", flush=True)
    playlists = yt_service.get_my_playlists()
    print(f"[MusicRoute] Returning {len(playlists)} playlists", flush=True)
    return jsonify(playlists)


@music_bp.route("/yt/playlist/<playlist_id>")
@login_required
def get_playlist_tracks(playlist_id):
    print(f"[MusicRoute] Fetching tracks for playlist: {playlist_id}", flush=True)
    data = yt_service.get_playlist_tracks(playlist_id)
    if data:
        print(f"[MusicRoute] Found {len(data.get('tracks', []))} tracks", flush=True)
        return jsonify(data)
    print("[MusicRoute] Failed to load tracks", flush=True)
    return jsonify({"status": "error", "message": "Failed to load playlist"}), 500


@music_bp.route("/yt/test")
@login_required
def test_yt():
    status = (
        "Authenticated" if yt_service.yt and yt_service.yt.auth else "Unauthenticated"
    )
    return jsonify({"status": status})


@music_bp.route("/yt/search")
@login_required
def search_music():
    query = request.args.get("q", "")
    if not query:
        return jsonify([])
    results = yt_service.search_tracks(query)
    return jsonify(results)
