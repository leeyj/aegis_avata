"""
AEGIS v3.1 Core Engine
@version v3.1.0
"""

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
    app.secret_key = FLASK_SECRET_KEY

    # 블루프린트 등록
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(widgets_bp)
    # app.register_blueprint(ai_bp) (Plugin-X로 통합)
    app.register_blueprint(model_bp)
    # app.register_blueprint(wallpaper_bp, url_prefix="/api/wallpaper") (Plugin-X로 통합)
    # app.register_blueprint(studio_bp) (Plugin-X로 통합)
    app.register_blueprint(api_v1_bp)
    app.register_blueprint(plugins_bp)
    app.register_blueprint(plugin_proxies_bp)
    app.register_blueprint(i18n_bp)
    # app.register_blueprint(google_svc_bp) (Plugin-X로 통합)

    # [Plugin-X] 동적 백엔드 리포지토리 등록 (Option B)
    plugin_blueprints = discover_plugin_blueprints()
    for bp in plugin_blueprints:
        app.register_blueprint(bp)

    # [보안] 플러그인별 선언된 CSP 도메인 초기 수집
    plugin_csp = get_all_plugin_csp_domains()

    # 템플릿 제어용 글로벌 함수 등록
    @app.context_processor
    def inject_globals():
        from utils import is_sponsor

        return dict(is_sponsor=is_sponsor)

    @app.after_request
    def add_security_headers(response):
        """브라우저 수준의 보안 강화 (v1.6.3 동적 CSP 적용)"""
        # 플러그인에서 수집된 도메인 병합
        dynamic_img_src = " ".join(plugin_csp.get("img-src", []))
        dynamic_script_src = " ".join(plugin_csp.get("script-src", []))
        dynamic_connect_src = " ".join(plugin_csp.get("connect-src", []))
        dynamic_frame_src = " ".join(plugin_csp.get("frame-src", []))

        response.headers["Content-Security-Policy"] = (
            f"default-src 'self'; "
            f"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com {dynamic_script_src}; "
            f"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            f"font-src 'self' https://fonts.gstatic.com data:; "
            f"img-src 'self' data: {dynamic_img_src}; "
            f"frame-src 'self' {dynamic_frame_src}; "
            f"connect-src 'self' ws: wss: {dynamic_connect_src};"
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

    # SocketIO 초기화 (앱 컨텍스트 연결)
    from services.socket_service import socketio

    socketio.init_app(app)

    # 디스코드 등 외부 봇 백그라운드 기동
    # Flask 재구동 시 봇 중복 실행을 막기 위해 서버 워커(Runtime) 환경에서만 1회 처리
    import os
    import sys

    # gods.py 로 구동되는 개발 서버인지 확인
    is_dev_server = "gods.py" in sys.argv[0] or "flask" in sys.argv[-1]

    if getattr(app, "bot_initialized", False):
        pass
    elif (
        is_dev_server and os.environ.get("WERKZEUG_RUN_MAIN") == "true"
    ) or not is_dev_server:
        app.bot_initialized = True
        from services.bot_init import initialize_bots

        initialize_bots()

    return app
