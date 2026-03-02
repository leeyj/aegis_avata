import os
import json
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from routes.config import PLUGINS_DIR, GEMINI_API_KEY

plugin_proxies_bp = Blueprint("plugin_proxies", __name__)


def _check_plugin_permission(plugin_id, permission):
    """해당 플러그인이 특정 권한을 가지고 있는지 검증합니다."""
    manifest_path = os.path.join(PLUGINS_DIR, plugin_id, "manifest.json")
    if not os.path.exists(manifest_path):
        return False
    try:
        with open(manifest_path, "r", encoding="utf-8-sig") as f:
            manifest = json.load(f)
            permissions = manifest.get("permissions", [])
            return permission in permissions
    except Exception:
        return False


@plugin_proxies_bp.route("/api/plugins/proxy/ai", methods=["POST"])
@login_required
def ai_proxy():
    """AEGIS AI Gateway: 플러그인이 서버를 통해 질의합니다."""
    from services import gemini_service, voice_service

    data = request.json
    plugin_id = data.get("plugin_id")
    task = data.get("task")
    payload = data.get("data", {})

    if not plugin_id or not task:
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    if not _check_plugin_permission(plugin_id, "api.ai_gateway"):
        return jsonify(
            {"status": "error", "message": "Permission Denied: api.ai_gateway"}
        ), 403

    # [Plugin-X] 플러그인별 독립 프롬프트 로직 적용
    result = gemini_service.get_plugin_briefing(
        GEMINI_API_KEY, plugin_id, task, payload
    )

    briefing_text = result.get("briefing") or result.get("response") or ""
    audio_url = (
        voice_service.generate_cached_tts(briefing_text, prefix=f"plugin_{plugin_id}")
        if briefing_text
        else None
    )

    return jsonify({"status": "success", "result": result, "audio_url": audio_url})
