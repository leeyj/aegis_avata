import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from utils import load_json_config

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

clock_plugin_bp = Blueprint("clock_plugin", __name__)


@clock_plugin_bp.route("/api/plugins/clock/config")
@login_required
def get_clock_config():
    return jsonify(load_json_config(CONFIG_PATH))


def initialize_plugin():
    """Clock 플러그인 초기화 및 액션 등록"""
    from services.plugin_registry import register_plugin_action, register_context_provider
    from datetime import datetime

    def clock_now_handler():
        now = datetime.now()
        return {"time": now.strftime("%Y-%m-%d %H:%M:%S"), "day": now.strftime("%A")}

    def clock_now_view_handler(result, platform="web", lang=None):
        return f"🕒 **현재 시간:** {result['time']} ({result['day']})"

    register_plugin_action(
        plugin_id="clock",
        action_id="now",
        handler=clock_now_handler,
        desc="Check current system time",
        args=[],
        view_handler=clock_now_view_handler
    )
    
    register_context_provider(
        "clock",
        clock_now_handler,
        aliases=["시계", "시간", "현재시간", "clock", "time"]
    )

# 초기화 실행
initialize_plugin()
