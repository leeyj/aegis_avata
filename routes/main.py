import os
from flask import Blueprint, render_template, jsonify, send_from_directory, request
from routes.decorators import login_required
from utils import load_settings

main_bp = Blueprint("main", __name__)


@main_bp.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(main_bp.root_path, "..", "static"),
        "favicon.png",
        mimetype="image/png",
    )


@main_bp.route("/img/<path:filename>")
def serve_img(filename):
    """루트 img 폴더의 자산을 서빙 (도움말 위젯용)"""
    return send_from_directory(os.path.join(main_bp.root_path, "..", "img"), filename)


@main_bp.route("/")
@login_required
def index():
    settings = load_settings()
    return render_template("index.html", settings=settings)


@main_bp.route("/save_log", methods=["POST"])
@login_required
def save_log():
    from datetime import datetime

    data = request.json
    logs = data.get("logs", [])  # 배열로 받음
    if not logs:
        # 단일 로그 호환성 유지
        msg = data.get("message", "")
        level = data.get("level", "INFO")
        logs = [{"message": msg, "level": level}]

    try:
        with open("web_debug.log", "a", encoding="utf-8") as f:
            for log in logs:
                msg = log.get("message", "")
                level = log.get("level", "INFO")
                dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"[{dt}] [{level}] {msg}\n")
        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
