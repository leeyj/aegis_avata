import os
from flask import Blueprint, jsonify, send_from_directory, Response
from routes.decorators import login_required
from routes.config import PLUGINS_DIR

# Import from separated services
from services.plugin_bundler import get_plugin_init_pack_data, get_plugin_cache

plugins_bp = Blueprint("plugins", __name__)


@plugins_bp.route("/api/plugins/active")
@login_required
def get_active_plugins():
    init_pack = get_plugin_init_pack_data()
    return jsonify(init_pack["plugins"])


@plugins_bp.route("/api/plugins/aliases")
@login_required
def get_all_aliases():
    """Plugin-X 레지스트리에 등록된 모든 알리아스 매핑 반환"""
    from services.plugin_registry import get_context_aliases
    return jsonify(get_context_aliases())


@plugins_bp.route("/api/plugins/assets/<plugin_id>/<path:filename>")
@login_required
def get_plugin_asset(plugin_id, filename):
    """플러그인 자산 전용 서빙 라우트 (폴백용)"""
    plugin_path = os.path.join(PLUGINS_DIR, plugin_id)
    if not os.path.exists(plugin_path):
        return jsonify({"status": "error", "message": "Plugin not found"}), 404

    mimetype = None
    if filename.endswith(".js"):
        mimetype = "application/javascript"
    elif filename.endswith(".css"):
        mimetype = "text/css"
    response = send_from_directory(plugin_path, filename, mimetype=mimetype)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@plugins_bp.route("/api/plugins/init_pack")
@login_required
def get_plugin_init_pack():
    """[v2.3.0] Super Bundle: Pre-serialized JSON 응답으로 오버헤드 최소화"""
    cache = get_plugin_cache()
    if not cache["json"]:
        get_plugin_init_pack_data(rebuild=True)

    print(f"[InitPack] Serving Super Bundle (Hash: {cache['hash'][:8]})")
    return Response(cache["json"], mimetype="application/json")


@plugins_bp.route("/api/plugins/version")
@login_required
def get_plugin_version():
    """[v2.3.0] 현재 플러그인 팩의 해시 버전만 반환 (클라이언트 캐시 검증용)"""
    cache = get_plugin_cache()
    if not cache["hash"]:
        get_plugin_init_pack_data(rebuild=True)
    return jsonify({"version": cache["hash"]})
