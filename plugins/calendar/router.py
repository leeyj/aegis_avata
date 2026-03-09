import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .calendar_service import get_today_events
from utils import load_json_config, get_plugin_i18n
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


def initialize_plugin():
    """일정 플러그인 초기화 및 액션 등록"""
    from services.plugin_registry import register_plugin_action
    from .calendar_service import create_event

    # 1. ADD 등록
    def add_calendar_handler(arg1, arg2=""):
        """[v3.7.5] 시간과 제목의 순서가 바뀌어도 지능적으로 처리"""
        import re

        # 시간 패턴 (HH:MM 또는 YYYY-MM-DD HH:MM)
        time_pattern = r"(\d{4}-\d{2}-\d{2}\s+)?\d{1,2}:\d{2}"

        summary = ""
        time_str = ""

        if re.search(time_pattern, arg1):
            time_str = arg1
            summary = arg2 or "새 일정"
        elif re.search(time_pattern, arg2):
            time_str = arg2
            summary = arg1
        else:
            # 둘 다 시간이 아니면 arg1을 제목으로, 현재+1시간을 시간으로
            summary = arg1
            time_str = ""  # 서비스에서 현재+1시간 처리됨

        res = create_event(summary, time_str)
        return res.get("status") == "SUCCESS"

    register_plugin_action(
        plugin_id="calendar",
        action_id="add",
        handler=add_calendar_handler,
        desc=get_plugin_i18n("calendar", "actions.add.desc"),
        args=get_plugin_i18n("calendar", "actions.add.args"),
        sync_cmd="CALENDAR_SYNC",
    )

    # 2. LIST 등록
    def calendar_list_view_handler(result, platform="web", lang=None):
        if not result:
            return get_plugin_i18n("calendar", "views.empty", lang=lang)

        bullet = "-" if platform == "discord" else "•"
        lines = []
        for e in result:
            summary = e.get(
                "summary", get_plugin_i18n("calendar", "views.unknown_title", lang=lang)
            )
            start = e.get(
                "start", get_plugin_i18n("calendar", "views.unknown_start", lang=lang)
            )
            lines.append(f"{bullet} {summary} ({start})")
        return "\n".join(lines)

    register_plugin_action(
        plugin_id="calendar",
        action_id="list",
        handler=get_calendar_context,
        desc=get_plugin_i18n("calendar", "actions.list.desc"),
        args=get_plugin_i18n("calendar", "actions.list.args"),
        sync_cmd="CALENDAR_LIST_SYNC",
        view_handler=calendar_list_view_handler,
    )


register_context_provider(
    "calendar", get_calendar_context, aliases=["일정", "달력", "스케줄", "계획"]
)

# 플러그인 로드 시 초기화 실행
initialize_plugin()


@calendar_plugin_bp.route("/api/plugins/calendar/events")
@login_required
@require_permission("api.google_suite")
def get_calendar_events():
    return jsonify(get_today_events())


@calendar_plugin_bp.route("/api/plugins/calendar/config")
@login_required
def get_calendar_config():
    return jsonify(load_json_config(CONFIG_PATH))
