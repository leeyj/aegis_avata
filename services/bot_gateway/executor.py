import logging
import re
from typing import Dict, Tuple, Optional
from .formatter import ResponseFormatter
import services.voice_service as voice_service

logger = logging.getLogger(__name__)


class ActionExecutor:
    """플러그인 액션 실행 및 AI 폴백 엔진"""

    def __init__(self, manager):
        self.manager = manager

    def execute_deterministic_action(
        self,
        action_info: Tuple[str, str],
        action_params: str,
        target_id: str,
        platform: str,
        lang: str,
        sid: Optional[str] = None,
    ) -> Optional[Dict]:
        """확정적 플러그인 액션 실행 (shlex 파싱 결과 등)"""
        from services.plugin_registry.action_manager import (
            get_all_actions,
            get_action_view_handler,
        )

        action_key = f"{action_info[0]}_{action_info[1]}".upper()
        providers, _ = get_all_actions()

        if action_key not in providers:
            logger.error(f"[Executor Debug] {action_key} not in providers! Available: {list(providers.keys())}")
            return None

        result = providers[action_key](action_params, target_id=target_id)

        # [v3.8.5] 결과 처리 (Success, Message) 튜플 대응
        error_msg = None
        if isinstance(result, tuple) and len(result) >= 2:
            if result[0] is False:
                error_msg = result[1]
                result = False
            else:
                result = result[1]

        if result is not False:
            view_handler = get_action_view_handler(action_key)
            if view_handler:
                display_text = view_handler(result, platform=platform, lang=lang)
            else:
                display_text = ResponseFormatter.format_result(
                    result, platform=platform, lang=lang
                )

            # [v4.2.5] TTS and HUD Broadcasting for deterministic actions
            try:
                # Clean display text for TTS (strip markdown and system prefixes)
                clean_briefing = re.sub(r"\[.*?\]", "", display_text).strip()
                audio_url = voice_service.generate_cached_tts(clean_briefing, prefix="action")

                if audio_url:
                    self.manager.broadcast_to_hud(
                        "ai_chat",
                        {
                            "input": f"/{action_info[1]} {action_params}".strip(),
                            "response": display_text,
                            "briefing": clean_briefing,
                            "audio_url": audio_url,
                            "visual_type": "ai",
                            "motion": "happy"
                        },
                        sid=sid
                    )
            except Exception as e:
                logger.error(f"[Executor] TTS/Broadcast Error: {e}")

            return {
                "text": f"✅ [SYSTEM] Action '{action_key}' executed.\n{display_text}"
            }
        else:
            fail_msg = (
                f"❌ [SYSTEM] Action '{action_key}' failed: {error_msg}"
                if error_msg
                else f"❌ [SYSTEM] Action '{action_key}' failed. Please check parameters."
            )
            return {"text": fail_msg}

    def run_ai_fallback(
        self,
        text: str,
        target_id: str,
        context_data: Dict = None,
        model: str = "gemini",
        lang: str = None,
        extra_instruction: str = None,
        restrict_to_plugin_id: str = None,
        with_search: bool = True,
        sid: Optional[str] = None,
    ) -> Dict:
        """AI 엔진을 통한 자율 액션 또는 대화 실행"""
        return self.manager.intelligence.fallback_to_ai(
            text,
            context_data=context_data or {},
            target_id=target_id,
            model=model,
            lang=lang,
            extra_instruction=extra_instruction,
            action_prompts=self.manager.action_prompts,
            action_handlers=self.manager.action_handlers,
            restrict_to_plugin_id=restrict_to_plugin_id,
            with_search=with_search,
            sid=sid,
        )
