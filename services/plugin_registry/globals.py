# 전역 레지스트리
_context_providers = {}
_ai_processors = {}
_context_aliases = {}
_action_providers = {}  # {unique_key: handler_func}
_action_prompts = {}  # {unique_key: prompt_instruction}
_action_metadata = {}  # {unique_key: plugin_id}
_deterministic_actions = {}  # {plugin_id: {command_keyword: action_id}}
_action_help_data = {}  # {unique_key: {"desc": ..., "args": ...}}
_action_view_handlers = {}  # {unique_key: view_func(result, platform)}
