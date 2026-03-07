import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .calendar_service import get_today_events
from utils import load_json_config
from services.plugin_registry import register_context_provider
from services import require_permission

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

calendar_plugin_bp = Blueprint("calendar_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_calendar_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    res = get_today_events()
    if isinstance(res, dict) and res.get("status") == "SUCCESS":
        return res.get("events", [])
    return []


register_context_provider(
    "calendar", get_calendar_context, aliases=["일정", "달력", "스케줄"]
)


@calendar_plugin_bp.route("/api/plugins/calendar/events")
@login_required
@require_permission("api.google_suite")
def get_calendar_events():
    return jsonify(get_today_events())


@calendar_plugin_bp.route("/api/plugins/calendar/config")
@login_required
def get_calendar_config():
    return jsonify(load_json_config(CONFIG_PATH))
