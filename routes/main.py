from flask import Blueprint, render_template, jsonify, request
import os
import json
from routes.decorators import login_required

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
@login_required
def index():
    from utils import load_settings

    settings = load_settings()
    return render_template("index.html", settings=settings)


@main_bp.route("/save_log", methods=["POST"])
@login_required
def save_log():
    from flask import request, jsonify
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

        return jsonify({"status": "ok"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
