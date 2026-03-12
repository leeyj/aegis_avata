from .manager import BotManager
from services.bot_adapters import BotAdapter

# 외부 호환성을 위해 싱글톤 인스턴스를 노출
bot_manager = BotManager()
