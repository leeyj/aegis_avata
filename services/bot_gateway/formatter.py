from utils import get_i18n


class ResponseFormatter:
    """플랫폼별 응답 포맷팅 모듈"""

    @staticmethod
    def format_result(result, platform="web", lang=None) -> str:
        """액션 실행 결과를 플랫폼에 맞게 가공합니다."""
        if result is True:
            return get_i18n("bot.action_success", lang=lang)
        if result is False:
            return get_i18n("bot.action_fail", lang=lang)
        if not result:
            return get_i18n("bot.no_data_fallback", lang=lang)

        # 기본 리스트 처리
        if isinstance(result, list):
            bullet = "-" if platform == "discord" else "•"
            items = [f"{bullet} {str(item)}" for item in result]
            return "\n".join(items)

        # 기본 딕셔너리 처리
        if isinstance(result, dict):
            import json

            return f"```json\n{json.dumps(result, indent=2, ensure_ascii=False)}\n```"

        return str(result)
