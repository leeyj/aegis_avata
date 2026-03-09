"""
AEGIS v3.1 Core Engine
@version v3.1.0
"""

import os
import json
import sys
from flask import Flask, request
from routes.main import main_bp
from routes.auth import auth_bp
from routes.widgets import widgets_bp

# from routes.ai import ai_bp (Plugin-X로 통합됨)
from routes.models import model_bp
from routes.api_v1 import api_v1_bp
from routes.config import FLASK_SECRET_KEY
from routes.plugins import (
    plugins_bp,
    get_all_plugin_csp_domains,
    discover_plugin_blueprints,
)
from routes.plugin_proxies import plugin_proxies_bp
from routes.i18n import i18n_bp


def create_app():
    """
    AEGIS Flask Application Factory
    앱 인스턴스를 생성하고 블루프린트 및 설정을 초기화합니다.
    """
    app = Flask(__name__, template_folder="templates", static_folder="static")

    # [v3.4.5] 통합 설정 로드 및 네트워크 최적화
    def get_settings():
        settings_path = os.path.join(app.root_path, "settings.json")
        if os.path.exists(settings_path):
            with open(settings_path, "r", encoding="utf-8") as f:
                try:
                    return json.load(f)
                except Exception:
                    return {}
        return {}

    settings = get_settings()
    network_config = settings.get("network", {})
    if not isinstance(network_config, dict):
        network_config = {}

    # 1. 역방향 프록시 대응 (Nginx 등)
    if network_config.get("use_proxy", False):
        from werkzeug.middleware.proxy_fix import ProxyFix

        p_count = network_config.get("proxy_count", 1)
        app.wsgi_app = ProxyFix(
            app.wsgi_app,
            x_for=p_count,
            x_proto=p_count,
            x_host=p_count,
            x_port=p_count,
            x_prefix=p_count,
        )

    # 2. SocketIO 초기화 (순환 참조 방지를 위해 지연 임포트)
    from services.socket_service import socketio

    socketio.init_app(app)

    app.secret_key = FLASK_SECRET_KEY

    # 블루프린트 등록
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(widgets_bp)
    app.register_blueprint(model_bp)
    app.register_blueprint(api_v1_bp)
    app.register_blueprint(plugins_bp)
    app.register_blueprint(plugin_proxies_bp)
    app.register_blueprint(i18n_bp)

    # [Plugin-X] 동적 백엔드 리포지토리 등록 (Option B)
    plugin_blueprints = discover_plugin_blueprints()
    for bp in plugin_blueprints:
        app.register_blueprint(bp)

    # [보안] 플러그인별 선언된 CSP 도메인 수집
    plugin_csp = get_all_plugin_csp_domains()
    user_csp = network_config.get("csp_allow_list", {})

    # 템플릿 제어용 글로벌 함수 등록
    @app.context_processor
    def inject_globals():
        from utils import is_sponsor

        return dict(is_sponsor=is_sponsor, settings=settings)

    @app.after_request
    def add_security_headers(response):
        """브라우저 수준의 보안 강화 (v3.4.5 동적 CSP 및 로컬 자산 우선 정책)"""

        def merge_csp(key, core_list):
            plugin_list = plugin_csp.get(key, [])
            custom_list = user_csp.get(key, [])
            # 중복 제거 및 공백 병합
            return " ".join(set(core_list + plugin_list + custom_list))

        script_src = merge_csp(
            "script-src", ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"]
        )
        style_src = merge_csp(
            "style-src", ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]
        )
        img_src = merge_csp("img-src", ["'self'", "data:"])
        connect_src = merge_csp("connect-src", ["'self'", "ws:", "wss:"])
        frame_src = merge_csp("frame-src", ["'self'"])
        font_src = merge_csp(
            "font-src", ["'self'", "https://fonts.gstatic.com", "data:"]
        )

        response.headers["Content-Security-Policy"] = (
            f"default-src 'self'; "
            f"script-src {script_src}; "
            f"style-src {style_src}; "
            f"font-src {font_src}; "
            f"img-src {img_src}; "
            f"frame-src {frame_src}; "
            f"connect-src {connect_src};"
        )
        return response

    # [Safe API Response] API 경로에서 에러 발생 시 HTML 대신 JSON 반환
    from flask import jsonify

    @app.errorhandler(403)
    def forbidden(e):
        return (
            jsonify({"status": "error", "message": str(e.description)}),
            403,
        )

    @app.errorhandler(404)
    def page_not_found(e):
        if request.path.startswith("/api/"):
            return (
                jsonify({"status": "error", "message": "API endpoint not found"}),
                404,
            )
        return e

    @app.errorhandler(500)
    def internal_server_error(e):
        if request.path.startswith("/api/"):
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Internal Server Error",
                        "type": "InternalError",
                    }
                ),
                500,
            )
        return e

    # [v3.4.3] 배포 환경 대응: gods.py를 배포 모드(debug=False)로 직접 실행하거나
    # 상용 WAS(Gunicorn 등)에서 구동될 때 봇이 초기화되도록 보장합니다.
    is_dev_server = "gods.py" in sys.argv[0] or "flask" in sys.argv[-1]
    is_reloader_child = os.environ.get("WERKZEUG_RUN_MAIN") == "true"

    # 봇 기동 허용 조건:
    # 1. 상용 WAS 환경 (is_dev_server=False)
    # 2. 로컬 개발 서버의 리로더 자식 프로세스 (is_reloader_child=True)
    # 3. 리로더를 사용하지 않는 직접 실행 환경 (not app.debug)
    should_init_bot = not is_dev_server or is_reloader_child or not app.debug

    if getattr(app, "bot_initialized", False):
        pass
    elif should_init_bot:
        app.bot_initialized = True
        from services.bot_init import initialize_bots

        initialize_bots()

    return app
