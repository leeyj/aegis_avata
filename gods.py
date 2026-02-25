from flask import Flask
from routes.main import main_bp
from routes.auth import auth_bp
from routes.widgets import widgets_bp
from routes.ai import ai_bp
from routes.models import model_bp
from routes.music import music_bp

from routes.config import FLASK_SECRET_KEY

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = FLASK_SECRET_KEY

# 블루프린트 등록
app.register_blueprint(main_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(widgets_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(model_bp)
app.register_blueprint(music_bp)

if __name__ == "__main__":
    # 내부망 및 외부망 접근 허용을 위해 0.0.0.0 포커싱
    app.run(host="0.0.0.0", port=8001, debug=False)
