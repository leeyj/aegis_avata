import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .system_service import get_system_stats
from utils import load_json_config, get_plugin_i18n
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

system_stats_plugin_bp = Blueprint("system_stats_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_system_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    config = load_json_config(CONFIG_PATH)
    return get_system_stats(config)


def initialize_plugin():
    """시스템 상태 플러그인 초기화 및 액션 등록"""
    from services.plugin_registry import register_plugin_action

    # 1. REPORT 등록
    def system_report_view_handler(result, platform="web", lang=None):
        if not result:
            return get_plugin_i18n("system-stats", "views.fail", lang=lang)

        cpu = result.get("cpu_usage", "??")
        mem = result.get("memory", {}).get("percent", "??")
        disk = result.get("disk", {}).get("percent", "??")

        title = get_plugin_i18n("system-stats", "views.title", lang=lang)
        return f"{title}\n- CPU: {cpu}%\n- RAM: {mem}%\n- Disk: {disk}%"

    register_plugin_action(
        plugin_id="system-stats",
        action_id="report",
        handler=get_system_context,
        desc=get_plugin_i18n("system-stats", "actions.report.desc"),
        args=get_plugin_i18n("system-stats", "actions.report.args"),
        sync_cmd="SYSTEM_REPORT_SYNC",
        view_handler=system_report_view_handler,
    )


register_context_provider(
    "system-stats",
    get_system_context,
    aliases=["시스템", "상태", "컴퓨터", "system", "stats"],
)

# 플러그인 로드 시 초기화 실행
initialize_plugin()


@system_stats_plugin_bp.route("/api/plugins/system-stats/data")
@login_required
def get_system_stats_data():
    config = load_json_config(CONFIG_PATH)
    return jsonify(get_system_stats(config))


@system_stats_plugin_bp.route("/api/plugins/system-stats/config")
@login_required
def get_system_config():
    return jsonify(load_json_config(CONFIG_PATH))
