from flask import Blueprint, jsonify
from services.bot_gateway import bot_manager
from .alarm_core import alarm_service
from utils import load_json_config, get_plugin_i18n

# Flask Blueprint
alarm_bp = Blueprint("alarm", __name__)


def initialize_plugin():
    """알람 플러그인 백엔드 초기화"""

    # 1. 알람이 울렸을 때 실행될 콜백 정의 (BotManager를 통해 메시지 전송)
    def alarm_triggered_callback(msg, target_id=None):
        instance = bot_manager
        if instance:
            # 모든 등록된 어댑터들에게 알림 시도
            for name, adapter in instance.adapters.items():
                try:
                    if target_id:
                        adapter.send_text(target_id, msg)
                    else:
                        adapter.send_text("system", msg)
                except Exception as e:
                    print(f"[AlarmPlugin] Failed to send alarm via {name}: {e}")

            # HUD 동기화
            instance.broadcast_to_hud(
                "system_command", {"command": "ALARM_TRIGGER", "text": msg}
            )

    # 2. [Systemic v3.6.0] register_plugin_action 활용
    from services.plugin_registry import register_plugin_action

    def set_alarm_handler(time_str, title, target_id=None):
        """실제 알람 로직만 수행 (파싱/HUD동기화는 시스템이 처리)"""
        return alarm_service.set_alarm(time_str, title, target_id=target_id)

    register_plugin_action(
        plugin_id="alarm",
        action_id="set",
        handler=set_alarm_handler,
        desc=get_plugin_i18n("alarm", "actions.set.desc"),
        args=get_plugin_i18n("alarm", "actions.set.args"),
        sync_cmd="ALARM_SYNC",
    )

    # 3. [v3.7.0] DEL 등록
    def del_alarm_handler(alarm_id):
        # alarm_id가 숫자일 수도 있으므로 변환 시도
        try:
            val = int(alarm_id)
            success = alarm_service.delete_alarm(val)
            return success
        except:
            return False

    register_plugin_action(
        plugin_id="alarm",
        action_id="del",
        handler=del_alarm_handler,
        desc=get_plugin_i18n("alarm", "actions.del.desc"),
        args=get_plugin_i18n("alarm", "actions.del.args"),
        sync_cmd="ALARM_SYNC",
    )

    # 4. [v3.7.0] LIST 등록
    def alarm_list_view_handler(result, platform="web", lang=None):
        if not result:
            return get_plugin_i18n("alarm", "views.empty", lang=lang)

        bullet = "-" if platform == "discord" else "•"
        lines = []
        for a in result:
            # 알람 데이터 구조: {'id': 1, 'time': '...', 'title': '...'}
            aid = a.get("id", "?")
            time = a.get("time", "Unknown")
            title = a.get("title", "No Title")
            fmt = get_plugin_i18n("alarm", "views.format", lang=lang)
            lines.append(f"{bullet} {fmt.format(aid=aid, title=title, time=time)}")
        return "\n".join(lines)

    register_plugin_action(
        plugin_id="alarm",
        action_id="list",
        handler=lambda: alarm_service.get_active_alarms(),
        desc=get_plugin_i18n("alarm", "actions.list.desc"),
        args=get_plugin_i18n("alarm", "actions.list.args"),
        sync_cmd="ALARM_LIST_SYNC",
        view_handler=alarm_list_view_handler,
    )

    # 3. [Plugin-X] 레지스트리에 데이터 공급자 등록 (@알람 지원)
    from services.plugin_registry import register_context_provider

    def alarm_context_provider():
        return {
            "active_alarms": alarm_service.get_active_alarms(),
            "description": "사용자의 알람 설정 및 목록 관리 전문가입니다. [ACTION] ALARM_SET 형식을 사용하여 새 알람을 예약할 수 있습니다.",
        }

    # [v3.0.2] manifest.json에서 알리아스 동적 로드 (하드코딩 배제)
    import os

    manifest_path = os.path.join(os.path.dirname(__file__), "manifest.json")
    manifest = load_json_config(manifest_path)
    aliases = manifest.get("aliases", [])

    register_context_provider(
        plugin_id="alarm", provider_func=alarm_context_provider, aliases=aliases
    )


# API Routes (Widget Link)
@alarm_bp.route("/api/plugins/alarm/list")
def get_alarms():
    alarms = alarm_service.get_active_alarms()
    return jsonify({"status": "success", "alarms": alarms})


# 모듈 로드 시 초기화 실행
initialize_plugin()
