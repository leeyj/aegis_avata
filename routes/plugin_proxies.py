import os
import json
import logging

# 로깅 설정
logger = logging.getLogger(__name__)

# [Lint Noise Resolution] IDE에서 임포트를 인식하지 못하는 경우를 대비한 처리
try:
    from flask import Blueprint, jsonify, request
    from routes.decorators import login_required, standardized_plugin_response
    from routes.config import PLUGINS_DIR, GEMINI_API_KEY
except ImportError:
    # Dummy classes for linter
    class Blueprint:
        def __init__(self, *args, **kwargs):
            pass

        def route(self, *args, **kwargs):
            return lambda x: x

    def jsonify(*args, **kwargs):
        pass

    request = object()

    def login_required(x):
        return x

    def standardized_plugin_response(x):
        return x

    PLUGINS_DIR = ""
    GEMINI_API_KEY = ""

try:
    from google import genai
    from google.genai import types
except ImportError:
    logger.warning("google-genai package not found. External search will be disabled.")
    genai = None
    types = None

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
@standardized_plugin_response
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


def _route_external_search(query: str, api_key: str) -> dict:
    """# 접두사: 구글 웹 검색을 확정적으로 수행. AI의 추측 없음."""
    print(f"[Router] EXTERNAL SEARCH → query: {query}")

    if genai is None or types is None:
        return {
            "status": "error",
            "display": "구글 검색 모듈(google-genai)이 설치되지 않았습니다.",
        }

    try:
        client = genai.Client(api_key=api_key)
        res = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"다음 내용을 구글에서 검색하고 결과를 요약해줘: {query}",
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            ),
        )
        return {"status": "success", "display": res.text, "source": "external_search"}
    except Exception as e:
        return {"status": "error", "display": f"검색 실패: {e}"}


@plugin_proxies_bp.route("/api/system/ai/query", methods=["POST"])
@login_required
@standardized_plugin_response
def ai_gateway_query():
    """AI Gateway 일반 질의 및 라우팅 허브 (BotManager와 통합)"""
    from services.bot_gateway import bot_manager

    data = request.json
    raw_command = (data.get("command") or "").strip()
    model = data.get("model", "gemini")
    lang = data.get("lang")

    if not raw_command:
        return jsonify({"status": "error", "message": "No command provided"}), 400

    # [v3.3.5] 터미널 입력을 BotManager의 통합 라우팅으로 전달
    # 이를 통해 /뉴스, /@뉴스, #검색 등이 모든 곳에서 동일하게 작동함
    result = bot_manager.handle_incoming_message(
        platform="web_terminal",
        user_id="admin",  # 웹 대시보드는 기본 admin 권한
        text=raw_command,
        target_id="system",
        model=model,
        lang=lang,
    )

    if result.get("status") == "error":
        return jsonify(result), 500

    return jsonify(result)


@plugin_proxies_bp.route("/api/system/ai/help", methods=["GET"])
@login_required
def ai_gateway_help():
    from services.plugin_registry import get_unified_help_markdown

    help_md = get_unified_help_markdown()
    return jsonify({"status": "success", "help_text": help_md})
