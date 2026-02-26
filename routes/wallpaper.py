from flask import Blueprint, request, jsonify
import os
from utils import load_wallpaper_config, save_wallpaper_config, is_sponsor

wallpaper_bp = Blueprint("wallpaper", __name__)


@wallpaper_bp.route("/status")
def get_wallpaper_status():
    try:
        wp_config = load_wallpaper_config()
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


@wallpaper_bp.route("/upload", methods=["POST"])
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


@wallpaper_bp.route("/set", methods=["POST"])
def set_wallpaper_config():
    try:
        data = request.json

        # --- Sponsor 권한 강력 검증 ---
        is_sp = is_sponsor()

        if not is_sp:
            # 1. 차단: Mode
            if data.get("mode") in ["url", "rotation"]:
                data["mode"] = "static"

            # 2. 차단: URL
            current_url = str(data.get("current", ""))
            if current_url.startswith("http://") or current_url.startswith("https://"):
                data["current"] = ""  # 외부 URL 강제 초기화

            # 3. 차단: 비디오
            if data.get("is_video"):
                data["is_video"] = False
                data["current"] = ""
        # ----------------------------

        # --- URL 모드 디버깅 및 is_video 자동 감지 ---
        if data.get("mode") == "url":
            url_val = str(data.get("current", "")).lower()
            data["is_video"] = url_val.endswith((".mp4", ".webm"))
            print(
                f"[Wallpaper API] Mode: URL | URL: {data.get('current')} | IS_VIDEO: {data['is_video']}"
            )
        # ----------------------------

        save_wallpaper_config(data)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@wallpaper_bp.route("/list")
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
