from flask import Blueprint, request, jsonify
import os
from utils import (
    load_json_config,
    save_json_config,
    is_sponsor,
    get_plugin_i18n,
)
from routes.decorators import login_required

from werkzeug.utils import secure_filename
from routes.config import AEGIS_ROOT

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")
LOG_FILE = "web_debug.log"


def wp_log(msg):
    from datetime import datetime

    try:
        dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{dt}] [Wallpaper] {msg}\n")
    except Exception as e:
        print(f"Logging error: {e}")


wallpaper_plugin_bp = Blueprint("wallpaper_plugin", __name__)


@wallpaper_plugin_bp.route("/api/plugins/wallpaper/test_ping")
def test_ping():
    print("[Wallpaper] PING RECEIVED!")
    return jsonify({"status": "pong"})


def get_wallpaper_context():
    """배경화면 현재 상태를 터미널 컨텍스트로 제공"""
    try:
        from services.plugin_registry import register_context_provider

        wp_config = load_json_config(CONFIG_PATH)
        if wp_config:
            mode = wp_config.get("mode", "static")
            is_video = wp_config.get("is_video", False)
            current = wp_config.get("current", "Default")

            type_str = get_plugin_i18n(
                "wallpaper", "context.video" if is_video else "context.image"
            )
            msg = get_plugin_i18n("wallpaper", "context.status")
            return msg.format(mode=mode, type=type_str, current=current)
    except Exception:
        pass
    return get_plugin_i18n("wallpaper", "context.error")


# [v4.0] Plugin Context Registration
# 임포트 오류 시에도 블루프린트 등록이 가능하도록 예외 처리 및 절대 경로 시도
try:
    from services.plugin_registry import register_context_provider

    # [v3.8.9] 타입 안전성 보장 (list + list 에러 방지)
    ko_aliases = get_plugin_i18n("wallpaper", "aliases", lang="ko")
    en_aliases = get_plugin_i18n("wallpaper", "aliases", lang="en")

    aliases = (ko_aliases if isinstance(ko_aliases, list) else []) + (
        en_aliases if isinstance(en_aliases, list) else []
    )

    register_context_provider(
        "wallpaper", get_wallpaper_context, aliases=list(set(aliases))
    )
except Exception as e:
    print(f"[Wallpaper] Warning: Failed to register context provider: {e}")


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
# @login_required
def upload_wallpaper():
    wp_log("UPLOAD REQUEST START")
    try:
        wp_log(f"AEGIS_ROOT: {AEGIS_ROOT}")

        file = None
        raw_filename = ""
        file_bytes = None

        if request.is_json:
            # [v4.0] Bridge-safe Base64 Upload (Fallback/Legacy)
            wp_log("Handling JSON Base64 upload")
            data = request.json
            base64_data = data.get("fileData")
            raw_filename = data.get("fileName", "upload.png")

            if base64_data:
                import base64

                if "," in base64_data:
                    base64_data = base64_data.split(",")[1]
                file_bytes = base64.b64decode(base64_data)
                wp_log(f"Base64 decoded. Size: {len(file_bytes)} bytes")

        elif "X-File-Name" in request.headers:
            # [v4.0] Optimized Binary Transfer (Best for Videos)
            from urllib.parse import unquote

            raw_filename = unquote(request.headers.get("X-File-Name", "upload.bin"))
            file_bytes = request.get_data()
            is_binary_upload = True
            wp_log(f"Handling Raw Binary upload. Size: {len(file_bytes)} bytes")

        if not file_bytes:
            # Try standard multipart
            if "file" in request.files:
                file = request.files["file"]
                raw_filename = file.filename
                wp_log("Handling Multipart upload")
            else:
                wp_log("Error: No file data or raw binary found")
                return jsonify(
                    {"status": "error", "message": "No file data received"}
                ), 400

        wp_log(f"Target filename: {raw_filename}")

        # [v3.9.0] 한글 지원 파일명 정제 (secure_filename은 한글을 제거함)
        import re

        # 한글, 영문, 숫자, 점, 대시, 언더바만 허용하고 나머지는 제거
        filename = re.sub(r"[^a-zA-Z0-9ㄱ-ㅎㅏ-ㅣ가-힣._\-]", "_", raw_filename)
        # 보안을 위해 경로 구분자(..) 등 위험 요소 제거
        filename = filename.replace("..", "_").lstrip("./")

        if not filename or filename.startswith("."):
            import uuid

            ext = raw_filename.split(".")[-1] if "." in raw_filename else "jpg"
            filename = f"upload_{uuid.uuid4().hex[:8]}.{ext}"
            wp_log(f"Generated safe filename: {filename}")
        else:
            wp_log(f"Sanitized filename: {filename}")

        # [v4.0] 전역 AEGIS_ROOT 기반 절대 경로 사용 (업로드 안정성 확보)
        save_dir = os.path.join(AEGIS_ROOT, "static", "wallpaper")
        wp_log(f"Target directory: {save_dir}")

        if not os.path.exists(save_dir):
            wp_log(f"Creating directory: {save_dir}")
            os.makedirs(save_dir, exist_ok=True)

        save_path = os.path.join(save_dir, filename)
        wp_log(f"Saving file to: {save_path}")

        ext = filename.lower().split(".")[-1]
        is_video = ext in ["mp4", "webm"]
        wp_log(f"Is video: {is_video}")

        if not is_sponsor() and is_video:
            wp_log("Error: Video upload blocked for non-sponsor")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": get_plugin_i18n("wallpaper", "errors.sponsors_only"),
                    }
                ),
                403,
            )

        if file_bytes:
            with open(save_path, "wb") as f:
                f.write(file_bytes)
        elif file:
            file.save(save_path)

        wp_log(f"SUCCESS: File saved. Size: {os.path.getsize(save_path)} bytes")
        wp_log("UPLOAD REQUEST COMPLETE")

        return jsonify(
            {
                "status": "success",
                "url": f"/static/wallpaper/{filename}",
                "is_video": is_video,
            }
        )
    except Exception as e:
        import traceback

        wp_log(f"CRITICAL UPLOAD ERROR: {e}")
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            traceback.print_exc(file=f)
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
        # [v4.0] AEGIS_ROOT 기반 절대 경로 사용 (파일 조회 일관성 확보)
        save_dir = os.path.join(AEGIS_ROOT, "static", "wallpaper")
        if not os.path.exists(save_dir):
            print(f"[Wallpaper] List warning: Directory not found: {save_dir}")
            return jsonify({"files": []})

        files = [
            f
            for f in os.listdir(save_dir)
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".mp4", ".webm"))
        ]
        print(f"[Wallpaper] Found {len(files)} files in {save_dir}")
        return jsonify({"files": sorted(files, reverse=True)})
    except Exception as e:
        print(f"[Wallpaper] List Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
