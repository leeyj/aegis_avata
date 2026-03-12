import logging
import inspect
import shlex
from services.plugin_registry.globals import (
    _action_providers,
    _action_prompts,
    _action_metadata,
    _deterministic_actions,
    _action_help_data,
    _action_view_handlers,
)


def register_action_handler(
    action_key, handler_func, prompt_instruction=None, view_handler=None
):
    """
    [Legacy] 직접 수동으로 액션과 지침을 등록.
    """
    key = action_key.upper()
    _action_providers[key] = handler_func
    if prompt_instruction:
        _action_prompts[key] = prompt_instruction
    if view_handler:
        _action_view_handlers[key] = view_handler
    print(f"[PluginRegistry] Action Registered (Manual): {key}")


def register_plugin_action(
    plugin_id, action_id, handler, desc, args=None, sync_cmd=None, view_handler=None
):
    """
    [Systemic v3.7.1] 플러그인 액션 자동화 등록기.
    - unique_key: f"{plugin_id}_{action_id}".upper() 로 생성되어 전역 충돌을 방지함.
    - view_handler: 결과데이터를 플랫폼별로 포맷팅하는 콜백 (result, platform) -> str
    """
    key = f"{plugin_id}_{action_id}".upper()
    arg_list = args if args else []
    arg_count = len(arg_list)

    # 1. 자동 프롬프트 생성 (고유 키 사용)
    arg_desc = " | ".join([f"<{a}>" for a in arg_list]) if arg_list else "인자 없음"
    prompt_instruction = (
        f"### {action_id.upper()} ({plugin_id})\n"
        f"- 설명: {desc}\n"
        f"- 실행 조건: 사용자가 {desc}와 관련된 요청을 하면 반드시 아래의 [ACTION] 태그를 답변 마지막 줄에 포함하십시오.\n"
        f"- 태그 형식: [ACTION] {key}: {arg_desc}\n"
        f"- 주의: 인자 값은 반드시 '|'로 구분하며, 값 내에 '|'가 포함되지 않도록 하십시오."
    )

    # 2. 범용 핸들러 래퍼 (데이터 파싱 및 사후 처리 자동화)
    def universal_wrapper(action_data, target_id=None):
        # [v3.7.6] 파라미터 파싱 유연화: shlex를 사용하여 인용 부호(") 지원
        if "|" in action_data:
            parts = [p.strip() for p in action_data.split("|")]
        else:
            try:
                # shlex.split으로 인용 부호 내 공백 유지
                parts = shlex.split(action_data)
                if len(parts) > arg_count and arg_count > 0:
                    # 인자 개수보다 많으면 마지막 인자에 나머지 모두 병합 (Greedy)
                    final_parts = parts[: arg_count - 1]
                    final_parts.append(" ".join(parts[arg_count - 1 :]))
                    parts = final_parts
            except Exception as e:
                # 따옴표가 닫히지 않는 등 오류 시 기존 단순 split으로 폴백
                logging.warning(
                    f"shlex split failed ({e}), falling back to simple split"
                )
                parts = action_data.split(None, arg_count - 1)

        if len(parts) < arg_count:
            parts.extend([""] * (arg_count - len(parts)))

        try:
            # [v3.0.0] 타겟 ID(채널/사용자) 전달 지원
            # [v3.8.6] target_id 중복 전달 방지 로직 (TypeError 방어 코드)
            sig = inspect.signature(handler)
            if "target_id" in sig.parameters:
                # 이미 parts에 의해 target_id가 채워졌는지 확인 (arg_count가 파라미터 개수를 초과한 경우 방지)
                param_names = list(sig.parameters.keys())
                try:
                    target_id_index = param_names.index("target_id")
                    if arg_count > target_id_index:
                        # 이미 positional로 채워짐 -> keyword로 또 보내면 안됨
                        result = handler(*parts[:arg_count])
                    else:
                        result = handler(*parts[:arg_count], target_id=target_id)
                except ValueError:
                    result = handler(*parts[:arg_count], target_id=target_id)
            else:
                result = handler(*parts[:arg_count])

            if sync_cmd:
                from services.bot_gateway import BotManager

                BotManager().broadcast_to_hud("system_command", {"command": sync_cmd})
            return result
        except Exception as e:
            logging.error(f"Action Execution Error ({action_id}): {e}")
            return False

    # 등록 (메타데이터 포함)
    _action_providers[key] = universal_wrapper
    _action_prompts[key] = prompt_instruction
    _action_metadata[key] = plugin_id
    _action_help_data[key] = {"desc": desc, "args": arg_list}
    if view_handler:
        _action_view_handlers[key] = view_handler

    print(f"[PluginRegistry] Systemic Action Registered: {key}")


def get_action_view_handler(action_key):
    """특정 액션의 뷰 포맷터 조회"""
    return _action_view_handlers.get(action_key.upper())


def get_all_actions(plugin_id=None):
    """
    등록된 모든 액션 반환. plugin_id가 주어지면 해당 플러그인의 액션만 필터링.
    """
    if not plugin_id:
        return _action_providers, _action_prompts

    filtered_handlers = {}
    filtered_prompts = {}
    for key, pid in _action_metadata.items():
        if pid == plugin_id:
            filtered_handlers[key] = _action_providers[key]
            filtered_prompts[key] = _action_prompts[key]
    return filtered_handlers, filtered_prompts


def register_deterministic_action(command, plugin_id, action_id):
    """[v3.7.0] 확정적 명령어(한/영/단축키) 역발행 인덱스 등록 (플러그인별 격리)"""
    cmd = command.lower().strip()
    if plugin_id not in _deterministic_actions:
        _deterministic_actions[plugin_id] = {}
    _deterministic_actions[plugin_id][cmd] = action_id


def get_action_by_command(command, plugin_id=None):
    """명령어로 플러그인과 액션 ID 조회. plugin_id가 제공되면 해당 플러그인 내에서만 검색."""
    cmd = command.lower().strip()
    if plugin_id:
        if (
            plugin_id in _deterministic_actions
            and cmd in _deterministic_actions[plugin_id]
        ):
            return plugin_id, _deterministic_actions[plugin_id][cmd]
        return None

    # 전역 검색 (하위 호환 및 범용 명령어용)
    for pid, cmds in _deterministic_actions.items():
        if cmd in cmds:
            return pid, cmds[cmd]
    return None


def get_all_deterministic_actions():
    return _deterministic_actions


def get_action_help_info():
    """
    도움말 위젯 등에서 사용하기 위해 액션의 메타데이터(설명, 인자, 소속 플러그인)를 통합하여 반환합니다.
    """
    combined = {}
    for key, data in _action_help_data.items():
        combined[key] = data.copy()
        combined[key]["plugin_id"] = _action_metadata.get(key)
    return combined
