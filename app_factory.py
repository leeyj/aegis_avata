from flask import Flask
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
            f"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net {dynamic_script_src}; "
            f"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            f"font-src 'self' https://fonts.gstatic.com data:; "
            f"img-src 'self' data: {dynamic_img_src}; "
            f"frame-src 'self' {dynamic_frame_src}; "
            f"connect-src 'self' {dynamic_connect_src};"
        )
        return response

    return app
