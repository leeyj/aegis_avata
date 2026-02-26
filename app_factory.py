from flask import Flask
from routes.main import main_bp
from routes.auth import auth_bp
from routes.widgets import widgets_bp
from routes.ai import ai_bp
from routes.models import model_bp
from routes.music import music_bp
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

    return app
