from flask import Blueprint, request, jsonify
import os
from utils import (
    load_json_config,
    save_json_config,
    is_sponsor,
)
from routes.decorators import login_required

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

wallpaper_plugin_bp = Blueprint("wallpaper_plugin", __name__)


def get_wallpaper_context():
    """배경화면 현재 상태를 터미널 컨텍스트로 제공"""
    try:
        from services.plugin_registry import register_context_provider

        wp_config = load_json_config(CONFIG_PATH)
        if wp_config:
            mode = wp_config.get("mode", "static")
            is_video = wp_config.get("is_video", False)
            current = wp_config.get("current", "Default")
            return f"배경화면 모드: {mode}, 종류: {'비디오' if is_video else '이미지'}, 현재 파일: {current}"
    except Exception:
        pass
    return "배경화면 상태를 불러올 수 없습니다."


# 여기서 임시로 import를 내부에 넣지 않고 상단 혹은 안전하게 처리할 수 있도록 수정
from services.plugin_registry import register_context_provider

register_context_provider(
    "wallpaper", get_wallpaper_context, aliases=["배경화면", "월페이퍼", "배경"]
)


@wallpaper_plugin_bp.route("/api/plugins/wallpaper/status")
@login_required
def get_wallpaper_status():
    try:
        wp_config = load_json_config(CONFIG_PATH)
        if not wp_config:
            wp_config = {
                "mode": "static",
                "current": "",
                "interval": 300,
                "is_video": False,
            }
        return jsonify({"is_sponsor": is_sponsor(), "config": wp_config})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@wallpaper_plugin_bp.route("/api/plugins/wallpaper/upload", methods=["POST"])
@login_required
def upload_wallpaper():
    try:
        if "file" not in request.files:
            return jsonify({"status": "error", "message": "No file"}), 400
        file = request.files["file"]
        filename = file.filename
        if not filename:
            return jsonify({"status": "error", "message": "Empty filename"}), 400

        save_dir = os.path.join("static", "wallpaper")
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)

        ext = filename.lower().split(".")[-1]
        is_video = ext in ["mp4", "webm"]
        if not is_sponsor() and is_video:
            return jsonify({"status": "error", "message": "Sponsors only"}), 403

        save_path = os.path.join(save_dir, filename)
        file.save(save_path)
        return jsonify(
            {
                "status": "success",
                "url": f"/static/wallpaper/{filename}",
                "is_video": is_video,
            }
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@wallpaper_plugin_bp.route("/api/plugins/wallpaper/set", methods=["POST"])
@login_required
def set_wallpaper_config():
    try:
        data = request.json
        is_sp = is_sponsor()

        if not is_sp:
            if data.get("mode") in ["url", "rotation"]:
                data["mode"] = "static"
            current_url = str(data.get("current", ""))
            if current_url.startswith("http://") or current_url.startswith("https://"):
                data["current"] = ""
            if data.get("is_video"):
                data["is_video"] = False
                data["current"] = ""

        if data.get("mode") == "url":
            url_val = str(data.get("current", "")).lower()
            data["is_video"] = url_val.endswith((".mp4", ".webm"))

        save_json_config(CONFIG_PATH, data, merge=False)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@wallpaper_plugin_bp.route("/api/plugins/wallpaper/list")
@login_required
def get_wallpaper_list():
    try:
        save_dir = os.path.join("static", "wallpaper")
        if not os.path.exists(save_dir):
            return jsonify({"files": []})

        files = [
            f
            for f in os.listdir(save_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".mp4", ".webm"))
        ]
        return jsonify({"files": sorted(files, reverse=True)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500
