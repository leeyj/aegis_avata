from flask import Blueprint, jsonify
from services.bot_gateway import bot_manager
from .alarm_core import alarm_service

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

    alarm_service.set_callback(alarm_triggered_callback)

    # 2. BotManager에 [ACTION] SET_ALARM 핸들러 및 프롬프트 지침 등록
    alarm_instruction = (
        "사용자의 알람 요청 시 되묻거나 방법을 설명하지 말고, 반드시 답변 끝에 다음 태그를 포함하여 즉시 실행하십시오: "
        "[ACTION] SET_ALARM: YYYY-MM-DD HH:MM:SS | 내용"
    )

    def handle_set_alarm_action(action_data, target_id=None):
        """AI가 [ACTION] SET_ALARM: ... 태그를 생성했을 때 호출됨"""
        if "|" in action_data:
            time_part, title_part = action_data.split("|", 1)
            success, msg = alarm_service.set_alarm(
                time_part.strip(), title_part.strip(), target_id=target_id
            )
            if success:
                # 알람 목록 갱신을 위해 HUD에 명령 전송
                bot_manager.broadcast_to_hud(
                    "system_command", {"command": "ALARM_SYNC"}
                )
                print("[AlarmPlugin] Alarm successfully scheduled via AI action.")

    bot_manager.register_action_handler(
        "SET_ALARM", handle_set_alarm_action, prompt_instruction=alarm_instruction
    )
    print("[AlarmPlugin] Registered SET_ALARM handler with AI instruction.")

    # 3. [Plugin-X] 레지스트리에 데이터 공급자 등록 (@알람 지원)
    from services.plugin_registry import register_context_provider

    def alarm_context_provider():
        return {
            "active_alarms": alarm_service.get_active_alarms(),
            "description": "사용자의 알람 설정 및 목록 관리 전문가입니다. [ACTION] SET_ALARM 형식을 사용하여 새 알람을 예약할 수 있습니다.",
        }

    # [v3.0.2] manifest.json에서 알리아스 동적 로드 (하드코딩 배제)
    import os
    from utils import load_json_config

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
