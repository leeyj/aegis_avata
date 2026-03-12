import os
from flask import Blueprint
from services.bot_gateway import bot_manager
from .adapter import DiscordAdapter
from utils import load_json_config

# Flask Blueprint (필요 시 API 확장을 위해 생성)
discord_adapter_bp = Blueprint("adapter_discord", __name__)


def initialize_plugin():
    """플러그인 로드 시점에 디스코드 어댑터 등록"""
    # config 경로 탐색
    base_dir = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    secrets_path = os.path.join(base_dir, "config", "secrets.json")

    secrets = load_json_config(secrets_path)

    token = secrets.get("DISCORD_BOT_TOKEN")
    allowed_user = secrets.get("DISCORD_ALLOWED_USER_ID")

    if token and token != "YOUR_DISCORD_BOT_TOKEN_HERE":
        adapter = DiscordAdapter(token, allowed_user)
        bot_manager.register_adapter(adapter)

        if allowed_user:
            bot_manager.set_allowed_users("discord", [str(allowed_user)])

        print("[Plugin:Discord] Adapter registered to BotManager.")
    else:
        print("[Plugin:Discord] Skipping registration: Token missing or invalid.")


# 플러그인 모듈 로드 시 즉시 초기화 실행
initialize_plugin()
