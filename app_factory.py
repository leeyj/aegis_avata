from flask import Flask
from routes.main import main_bp
from routes.auth import auth_bp
from routes.widgets import widgets_bp
from routes.ai import ai_bp
from routes.models import model_bp
from routes.music import music_bp
from routes.wallpaper import wallpaper_bp
from routes.studio import studio_bp
from routes.api_v1 import api_v1_bp
from routes.config import FLASK_SECRET_KEY


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
    app.register_blueprint(ai_bp)
    app.register_blueprint(model_bp)
    app.register_blueprint(music_bp)
    app.register_blueprint(wallpaper_bp, url_prefix="/api/wallpaper")
    app.register_blueprint(studio_bp)
    app.register_blueprint(api_v1_bp)

    # 템플릿 제어용 글로벌 함수 등록
    @app.context_processor
    def inject_globals():
        from utils import is_sponsor

        return dict(is_sponsor=is_sponsor)

    return app
