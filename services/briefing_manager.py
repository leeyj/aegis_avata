import os
import json
import time
import datetime
from services import gemini_service, voice_service
from routes.config import PROMPTS_CONFIG_PATH
from utils import load_json_config


class BriefingManager:
    """
    브리핑의 생성, 캐싱, 음성 변환을 총괄 관리하는 매니저
    """

    def __init__(self, api_key, text_cache_path, audio_cache_path):
        self.api_key = api_key
        self.text_cache_path = text_cache_path
        self.audio_cache_path = audio_cache_path

    def get_briefing(self, context_data, debug_mode=True):
        """
        캐시를 확인하거나 새로운 브리핑을 생성하여 반환
        """
        # 1. 개발 모드 파일 캐시 확인
        if (
            debug_mode
            and os.path.exists(self.text_cache_path)
            and os.path.exists(self.audio_cache_path)
        ):
            try:
                with open(self.text_cache_path, "r", encoding="utf-8") as f:
                    cached_data = json.load(f)

                return {
                    "briefing": cached_data.get("briefing"),
                    "sentiment": cached_data.get("sentiment", "neutral"),
                    "visual_type": cached_data.get("visual_type", "none"),
                    "audio_url": f"/static/audio/last_briefing.mp3?t={os.path.getmtime(self.audio_cache_path)}",
                }
            except Exception:
                pass

        # 2. 새로운 Gemini 브리핑 생성
        result = gemini_service.get_briefing(self.api_key, context_data)
        briefing_text = result.get("briefing", "")

        # 3. 파일 캐시 저장 (JSON)
        os.makedirs(os.path.dirname(self.text_cache_path), exist_ok=True)
        with open(self.text_cache_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        # 4. 음성 파일 생성 (MP3)
        voice_service.generate_edge_tts(
            briefing_text, output_path=self.audio_cache_path
        )

        # 5. 최종 결과 조합
        return {
            "briefing": briefing_text,
            "sentiment": result.get("sentiment", "neutral"),
            "visual_type": result.get("visual_type", "none"),
            "audio_url": f"/static/audio/last_briefing.mp3?t={time.time()}",
        }

    def get_widget_briefing(self, widget_type, widget_data):
        """
        특정 위젯 데이터만 분석하여 요약 브리핑 생성
        """
        # 1. Gemini 분석 요청
        result = gemini_service.get_widget_briefing(
            self.api_key, widget_type, widget_data
        )
        briefing_text = result.get("briefing", "")

        # 2. 음성 파일 생성 (위젯 브리핑 전용 오디오 파일)
        widget_audio_path = self.audio_cache_path.replace(
            "last_briefing.mp3", f"widget_{widget_type}.mp3"
        )
        voice_service.generate_edge_tts(briefing_text, output_path=widget_audio_path)

        # 3. 결과 반환
        return {
            "briefing": briefing_text,
            "sentiment": result.get("sentiment", "neutral"),
            "audio_url": f"/static/audio/widget_{widget_type}.mp3?t={time.time()}",
        }

    def check_proactive(self, context_data, proactive_config):
        """
        데이터를 분석하여 선제적으로 알림(Alert)이 필요한지 확인
        """
        thresholds = proactive_config.get("thresholds", {})
        last_alerts = proactive_config.get("last_alerts", {})
        triggers = []

        # 1. 금융 지수 급변동 체크
        finance = context_data.get("finance")
        if finance:
            for name, data in finance.items():
                change = data.get("change_percent", 0)
                if abs(change) >= thresholds.get("finance_change_abs", 1.5):
                    # 너무 빈번한 알림 방지 (동일 지수 1시간 내 중복 방지 등 로직 생략 가능)
                    triggers.append(f"금융 지수 변동: {name} {change}% 감지")

        # 2. 일정 임박 체크 (15분 이내)
        calendar_events = context_data.get("calendar", [])
        now = datetime.datetime.now().astimezone()
        for event in calendar_events:
            start_str = event.get("start")
            if (
                start_str and "T" in start_str
            ):  # 시간 정보가 있는 경우만 (종일 일정 제외)
                try:
                    start_dt = datetime.datetime.fromisoformat(start_str)
                    diff = (start_dt - now).total_seconds() / 60
                    if 0 < diff <= thresholds.get("calendar_lead_time_min", 15):
                        triggers.append(
                            f"곧 일정이 시작됩니다: {event['summary']} ({int(diff)}분 전)"
                        )
                except Exception:
                    continue

        # 3. 트리거가 감지되면 Gemini에게 상황 보고 요청
        if triggers:
            prompts = load_json_config(PROMPTS_CONFIG_PATH)
            prompt_tpl = prompts.get("DASHBOARD_INTERNAL", {}).get("proactive", "")
            prompt = prompt_tpl.replace("{triggers}", ", ".join(triggers))
            result = gemini_service.get_custom_response(self.api_key, prompt)

            # 음성 생성
            voice_service.generate_edge_tts(
                result.get("text", ""), self.audio_cache_path
            )

            return {
                "triggered": True,
                "text": result.get("text"),
                "sentiment": result.get("sentiment", "neutral"),
                "visual_type": result.get("visual_type", "none"),
                "audio_url": f"/static/audio/last_briefing.mp3?t={time.time()}",
            }

        return {"triggered": False}

    def process_ai_command(self, command, context_data):
        """
        사용자의 커맨드를 분석하여 액션 및 응답 생성
        """
        return gemini_service.process_command(self.api_key, command, context_data)
