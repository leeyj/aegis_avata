import logging
from .bot_gateway import bot_manager

logger = logging.getLogger(__name__)


def initialize_bots():
    """
    등록된 모든 봇 어댑터들을 시작합니다.
    (각 어댑터는 플러그인 로드 시점에 이미 bot_manager에 등록되어 있어야 합니다.)
    """
    adapters = bot_manager.adapters
    if not adapters:
        logger.info("No bot adapters registered to start.")
        return

    for name, adapter in adapters.items():
        try:
            logger.info(f"Starting Bot Adapter: {name} ...")
            adapter.start()
        except Exception as e:
            logger.error(f"Failed to start adapter {name}: {e}")


if __name__ == "__main__":
    # 개별 테스트용
    initialize_bots()
