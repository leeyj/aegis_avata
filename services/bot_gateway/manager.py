import logging
from typing import Optional, Dict, List, Any
from services.bot_intelligence import IntelligenceHub

from .access_control import AccessControl
from .executor import ActionExecutor
from .router import MessageRouter

logger = logging.getLogger(__name__)


class BotManager:
    """
    AEGIS Messaging Hub (Refactored)
    중앙 제어 서비스로, 하위 모듈(Access, Router, Executor)을 총괄합니다.
    """

    _instance: Optional["BotManager"] = None
    adapters: Dict[str, Any]  # bot_adapters.BotAdapter
    action_handlers: Dict[str, callable]
    action_prompts: Dict[str, str]

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BotManager, cls).__new__(cls)
            cls._instance.adapters = {}
            cls._instance.action_handlers = {}
            cls._instance.action_prompts = {}

            # 하위 모듈 초기화
            cls._instance.access = AccessControl()
            cls._instance.executor = ActionExecutor(cls._instance)
            cls._instance.router = MessageRouter(cls._instance)

            # IntelligenceHub 초기화 (HUD 전송 콜백 연결)
            cls._instance.intelligence = IntelligenceHub(
                broadcast_callback=cls._instance.broadcast_to_hud
            )
        return cls._instance

    def register_adapter(self, adapter):
        name = adapter.platform_name()
        self.adapters[name] = adapter
        logger.info(f"Bot Adapter Registered: {name}")

    def register_action_handler(
        self, action_key: str, handler_func, prompt_instruction: Optional[str] = None
    ):
        key = action_key.upper()
        self.action_handlers[key] = handler_func
        if prompt_instruction:
            self.action_prompts[key] = prompt_instruction
        logger.info(f"[BotManager] Action Registered: {key}")

    def load_all_plugin_actions(self):
        """활성화된 플러그인의 명령어를 로드하여 등록"""
        try:
            from services.plugin_bundler import get_plugin_init_pack_data
            from services.plugin_registry import register_deterministic_action

            init_pack = get_plugin_init_pack_data()
            active_plugins = init_pack.get("plugins", [])

            count = 0
            for manifest in active_plugins:
                plugin_id = manifest.get("id")
                actions = manifest.get("actions", [])
                for action in actions:
                    action_id = action.get("id")
                    commands = action.get("commands", [])
                    
                    # [v4.2.10] 액션 ID 자체를 기본 명령어로 등록 (호환성 엔트리)
                    if action_id not in commands:
                        register_deterministic_action(action_id, plugin_id, action_id)
                        count += 1

                    for cmd in commands:
                        register_deterministic_action(cmd, plugin_id, action_id)
                        count += 1
            print(f"[BotManager] Loaded {count} deterministic actions.")
        except Exception as e:
            logger.error(f"[BotManager] Failed to load plugin actions: {e}")

    def set_allowed_users(self, platform: str, user_ids: List[str]):
        self.access.set_allowed_users(platform, user_ids)

    def is_user_allowed(self, platform: str, user_id: str) -> bool:
        return self.access.is_user_allowed(platform, user_id)

    def handle_incoming_message(
        self,
        platform: str,
        user_id: str,
        text: str,
        target_id: Optional[str] = None,
        model: str = "gemini",
        lang: Optional[str] = None,
        sid: Optional[str] = None,
    ) -> Dict:
        return self.router.handle(platform, user_id, text, target_id, model, lang, sid)

    def broadcast_to_hud(self, event_type: str, data: dict, sid: Optional[str] = None):
        from services.socket_service import emit_to_hud

        emit_to_hud(event_type, data, sid=sid)
