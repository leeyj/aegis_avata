from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from .ytmusic_service import yt_service
from services.plugin_registry import register_context_provider
from utils import get_plugin_i18n

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


def initialize_plugin():
    """유튜브 뮤직 플러그인 초기화 및 액션 등록"""
    from services.plugin_registry import register_plugin_action

    def yt_music_play_view_handler(result, platform="web", lang=None):
        if not result:
            return get_plugin_i18n("youtube-music", "views.play_fail", lang=lang)
        if isinstance(result, list) and len(result) > 0:
            track = result[0]
            title = track.get("title", "Unknown")
            artist = "Unknown"
            if "artists" in track and len(track["artists"]) > 0:
                artist = track["artists"][0].get("name", "Unknown")
            fmt = get_plugin_i18n("youtube-music", "views.play_format", lang=lang)
            return fmt.format(title=title, artist=artist)
        return get_plugin_i18n("youtube-music", "views.play_generic", lang=lang)

    def yt_play_handler(query):
        results = yt_service.search_tracks(query)
        if results and len(results) > 0:
            track = results[0]
            # [v3.8.8] Plugin-X: 전용 소켓 이벤트 대신 범용 system_command 사용
            from services.bot_gateway import bot_manager

            bot_manager.broadcast_to_hud(
                "system_command",
                {
                    "command": "YOUTUBE_PLAY",
                    "videoId": track.get("videoId"),
                    "title": track.get("title"),
                    "artist": track.get("artist"),
                    "tracks": results,
                },
            )
        return results

    register_plugin_action(
        plugin_id="youtube-music",
        action_id="play",
        handler=yt_play_handler,
        desc=get_plugin_i18n("youtube-music", "actions.play.desc"),
        args=get_plugin_i18n("youtube-music", "actions.play.args"),
        sync_cmd="MUSIC_PLAY",
        view_handler=yt_music_play_view_handler,
    )

    register_plugin_action(
        plugin_id="youtube-music",
        action_id="pause",
        handler=lambda: True,
        desc=get_plugin_i18n("youtube-music", "actions.pause.desc"),
        args=get_plugin_i18n("youtube-music", "actions.pause.args"),
        sync_cmd="MUSIC_PAUSE",
    )

    register_plugin_action(
        plugin_id="youtube-music",
        action_id="next",
        handler=lambda: True,
        desc=get_plugin_i18n("youtube-music", "actions.next.desc"),
        args=get_plugin_i18n("youtube-music", "actions.next.args"),
        sync_cmd="MUSIC_NEXT",
    )

    def yt_music_list_view_handler(result, platform="web", lang=None):
        if not result:
            return get_plugin_i18n("youtube-music", "views.list_empty", lang=lang)

        bullet = "-" if platform == "discord" else "•"
        lines = []
        for p in result:
            title = p.get("title", "No Title")
            lines.append(f"{bullet} {title}")
        return "\n".join(lines)

    register_plugin_action(
        plugin_id="youtube-music",
        action_id="list",
        handler=lambda: yt_service.get_my_playlists(),
        desc=get_plugin_i18n("youtube-music", "actions.list.desc"),
        args=get_plugin_i18n("youtube-music", "actions.list.args"),
        sync_cmd="MUSIC_LIST_SYNC",
        view_handler=yt_music_list_view_handler,
    )


register_context_provider(
    "youtube-music",
    get_ytmusic_context,
    aliases=["유튜브", "뮤직", "음악", "노래", "youtube", "yt"],
)

# 플러그인 로드 시 초기화 실행
initialize_plugin()


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
