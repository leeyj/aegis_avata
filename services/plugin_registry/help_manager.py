from services.plugin_registry.globals import (
    _action_help_data,
    _action_metadata,
    _context_aliases,
)
from services.plugin_registry.context_manager import get_context_aliases
from utils import get_i18n


def get_unified_help_markdown(lang="ko", platform="web"):
    """웹 HUD와 디스코드 봇에서 공통으로 사용할 통합 도움말 생성 (다국어 및 플랫폼 최적화 지원)"""
    aliases_map = get_context_aliases()
    provider_aliases = {}
    for alias, plugin in aliases_map.items():
        if plugin not in provider_aliases:
            provider_aliases[plugin] = []
        if alias not in provider_aliases[plugin]:
            provider_aliases[plugin].append(alias)

    # [v3.7.2] 하이브리드 지원 아이콘 추가
    from services.bot_intelligence import has_plugin_ai_prompt

    def get_plugin_display(plugin_id):
        icon = " 🧠" if has_plugin_ai_prompt(plugin_id) else ""
        return f"{plugin_id}{icon}"

    aliases_text = "\n".join(
        [
            f"- **{get_plugin_display(plugin)}**: `{'`, `'.join(aliases)}`"
            for plugin, aliases in provider_aliases.items()
        ]
    )

    # i18n 라벨 로드
    def h(key):
        return get_i18n(f"help.{key}", lang=lang)

    def th(key):
        return get_i18n(f"help.table_header.{key}", lang=lang)

    # [v3.7.1] 플러그인별 확정적 액션 테이블 생성
    if platform == "discord":
        actions_table = ""
    else:
        actions_table = f"| {th('widget')} | {th('action')} | {th('params')} | {th('desc')} |\n| :--- | :--- | :--- | :--- |\n"

    # Alias 매핑 최적화 (역방향 인덱스 생성)
    pid_to_alias = {}
    for alias, pid in aliases_map.items():
        if pid not in pid_to_alias:
            pid_to_alias[pid] = alias

    sorted_keys = sorted(_action_help_data.keys())
    for key in sorted_keys:
        plugin_id = _action_metadata.get(key)
        data = _action_help_data[key]
        if not data:
            continue

        action_name = key.split("_", 1)[1].lower() if "_" in key else key.lower()
        args_list = data.get("args") or []
        args_text = " | ".join([f"<{a}>" for a in args_list]) if args_list else "-"

        # [v3.7.2] 지원 체계 아이콘 추가
        from services.bot_intelligence import has_plugin_ai_prompt

        icons = []
        if data.get("desc"):
            icons.append("⚡")  # 액션 데이터가 있으면 확정적 명령 지원
        if has_plugin_ai_prompt(plugin_id):
            icons.append("🧠")

        icon_str = "".join(icons)
        display_name = (
            f"{pid_to_alias.get(plugin_id, plugin_id or 'System')} {icon_str}".strip()
        )

        if platform == "discord":
            # 디스코드는 마크다운 표를 지원하지 않으므로 가독성이 좋은 리스트 형태로 변환합니다.
            actions_table += f"• **{display_name}** > `{action_name}`: {data.get('desc', '-')} ({args_text})\n"
        else:
            actions_table += f"| {display_name} | {action_name} | {args_text} | {data.get('desc', '-')} |\n"

    help_md = f"""{h("title")}

{h("mode_1_title")}
{h("mode_1_desc")}
{h("mode_1_format")}
{h("mode_1_tip")}

{h("widget_ref_label")}
{actions_table}

{h("mode_2_title")}
{h("mode_2_desc")}
{h("mode_2_example")}
{h("mode_2_alias_label")}
{aliases_text}

{h("mode_3_title")}
{h("mode_3_desc")}
{h("mode_3_example")}

{h("mode_4_title")}
{h("mode_4_desc")}

{h("footer")}
"""
    return help_md
