from flask import Blueprint, jsonify
from plugins.calendar.calendar_service import get_today_events

timeline_ui_bp = Blueprint("timeline_ui", __name__)


@timeline_ui_bp.route("/api/plugins/timeline-ui/data")
def get_timeline_data():
    """타임라인용 캘린더 데이터를 반환합니다."""
    result = get_today_events()
    return jsonify(result)


def get_blueprint():
    return timeline_ui_bp
