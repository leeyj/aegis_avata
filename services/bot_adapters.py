import abc
from typing import Optional


class BotAdapter(abc.ABC):
    """
    AEGIS Universal Bot Bridge - 추상 베이스 클래스
    모든 외부 봇(Discord, Telegram 등)은 이 클래스를 상속받아야 함.
    """

    @abc.abstractmethod
    def platform_name(self) -> str:
        """플랫폼 이름 반환 (예: 'discord', 'telegram')"""
        pass

    @abc.abstractmethod
    def start(self):
        """봇 서버 또는 폴링 시작"""
        pass

    @abc.abstractmethod
    def stop(self):
        """봇 중지"""
        pass

    @abc.abstractmethod
    def send_text(self, target_id: str, text: str):
        """텍스트 메시지 전송"""
        pass

    @abc.abstractmethod
    def send_image(
        self, target_id: str, image_path: str, caption: Optional[str] = None
    ):
        """이미지(시큐어 요약 카드 등) 전송"""
        pass
