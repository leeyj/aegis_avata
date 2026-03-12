import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


class AccessControl:
    """사용자 권한 및 인증 관리 모듈"""

    def __init__(self):
        self.allowed_users: Dict[str, List[str]] = {}
        self._init_default_permissions()

    def _init_default_permissions(self):
        """기본 권한 설정 (Web Dashboard 및 External API 소스)"""
        self.allowed_users["web_terminal"] = ["admin"]

        try:
            from routes.config import SECRETS_CONFIG_PATH
            from utils import load_json_config

            secrets = load_json_config(SECRETS_CONFIG_PATH)
            external_keys = secrets.get("EXTERNAL_API_KEYS", {})
            for source in external_keys.keys():
                self.allowed_users[source] = [source]
            logger.info(
                f"[AccessControl] Auto-allowed {len(external_keys)} external API sources."
            )
        except Exception as e:
            logger.error(f"[AccessControl] Failed to auto-allow external sources: {e}")

    def set_allowed_users(self, platform: str, user_ids: List[str]):
        self.allowed_users[platform] = user_ids

    def is_user_allowed(self, platform: str, user_id: str) -> bool:
        allowed = self.allowed_users.get(platform, [])
        return str(user_id) in [str(uid) for uid in allowed]
