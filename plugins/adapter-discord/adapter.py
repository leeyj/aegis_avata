import discord
from discord.ext import commands
import asyncio
from typing import Optional
import logging
import threading
from services.bot_gateway import BotAdapter, bot_manager

logger = logging.getLogger(__name__)


class DiscordAdapter(BotAdapter):
    """
    AEGIS Discord Adapter (Plugin-Xized)
    디스코드 봇의 이벤트를 AEGIS BotManager로 중계합니다.
    """

    def __init__(self, token: str, allowed_user_id: str):
        self.token = token
        self.allowed_user_id = allowed_user_id

        # 인텐트 설정 (메시지 읽기 권한 포함)
        intents = discord.Intents.default()
        intents.message_content = True

        self.bot = commands.Bot(command_prefix="!", intents=intents)
        self._setup_events()
        self._loop = None

    def platform_name(self) -> str:
        return "discord"

    def _setup_events(self):
        @self.bot.event
        async def on_ready():
            logger.info(f"AEGIS Discord Bot connected as {self.bot.user}")
            # 슬래시 명령어 동기화 (필요 시)
            try:
                synced = await self.bot.tree.sync()
                logger.info(f"Synced {len(synced)} slash commands.")
            except Exception as e:
                logger.error(f"Failed to sync slash commands: {e}")

        @self.bot.event
        async def on_message(message):
            # 봇 자신의 메시지는 무시
            if message.author == self.bot.user:
                return

            print(f"[Discord] 📥 Received from {message.author}: {message.content}")

            # AEGIS BotManager에게 처리 위임
            try:
                result = bot_manager.handle_incoming_message(
                    platform="discord",
                    user_id=str(message.author.id),
                    text=message.content,
                    target_id=str(message.channel.id),
                )
            except Exception as e:
                print(f"[Discord] ❌ Error handling message: {e}")
                result = None

            if result:
                text_response = result.get("text")
                image_path = result.get("image")

                if image_path:
                    await self._send_image_async(
                        str(message.channel.id), image_path, text_response
                    )
                elif text_response:
                    await message.channel.send(text_response)

    def start(self):
        """별도의 스레드에서 봇을 비동기로 실행"""

        def run_bot():
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            try:
                self._loop.run_until_complete(self.bot.start(self.token))
            except Exception as e:
                logger.error(f"Discord Bot error: {e}")

        thread = threading.Thread(target=run_bot, daemon=True)
        thread.start()

    def stop(self):
        if self._loop:
            asyncio.run_coroutine_threadsafe(self.bot.close(), self._loop)

    def send_text(self, target_id: str, text: str):
        """특정 채널이나 유저에게 메시지 전송 (비동기 처리)"""
        if self._loop:
            asyncio.run_coroutine_threadsafe(
                self._send_async(target_id, text), self._loop
            )

    async def _send_async(self, target_id: str, text: str):
        try:
            channel = self.bot.get_channel(int(target_id))
            if not channel:
                user = await self.bot.fetch_user(int(target_id))
                if user:
                    channel = user.dm_channel or await user.create_dm()

            if channel:
                await channel.send(text)
        except Exception as e:
            logger.error(f"Discord send_text error: {e}")

    def send_image(
        self, target_id: str, image_path: str, caption: Optional[str] = None
    ):
        if self._loop:
            asyncio.run_coroutine_threadsafe(
                self._send_image_async(target_id, image_path, caption), self._loop
            )

    async def _send_image_async(
        self, target_id: str, image_path: str, caption: Optional[str] = None
    ):
        try:
            channel = self.bot.get_channel(int(target_id))
            if not channel:
                user = await self.bot.fetch_user(int(target_id))
                if user:
                    channel = user.dm_channel or await user.create_dm()

            if channel:
                file = discord.File(image_path)
                await channel.send(content=caption, file=file)
        except Exception as e:
            logger.error(f"Discord send_image error: {e}")
