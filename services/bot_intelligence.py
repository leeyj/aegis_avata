import re
import logging
import pytz
import os
from datetime import datetime
from typing import Optional, Dict
from utils import get_i18n, load_settings
from . import ai_service, voice_service

logger = logging.getLogger(__name__)


def load_prompt(filename: str, subfolder: str = "") -> str:
    """프롬프트 파일 로드"""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_path = os.path.join(base_dir, "config", "prompts", subfolder, filename)

    if not os.path.exists(target_path):
        logger.warning(f"Prompt file not found: {target_path}")
        return ""

    try:
        with open(target_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Error loading prompt {filename}: {e}")
        return ""


def load_plugin_ai_prompt(plugin_id: str) -> str:
    """[v3.7.2] 플러그인 폴더 내의 ai_prompt.md 로드 (Zero-Maintenance)"""
    from routes.config import PLUGINS_DIR

    prompt_path = os.path.join(PLUGINS_DIR, plugin_id, "ai_prompt.md")
    if os.path.exists(prompt_path):
        try:
            with open(prompt_path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Error loading plugin prompt for {plugin_id}: {e}")
    return ""


def has_plugin_ai_prompt(plugin_id: str) -> bool:
    """[v3.7.2] 플러그인이 @(하이브리드) 모드를 지원하는지 확인"""
    from routes.config import PLUGINS_DIR

    prompt_path = os.path.join(PLUGINS_DIR, plugin_id, "ai_prompt.md")
    return os.path.exists(prompt_path)


class IntelligenceHub:
    """
    AEGIS Intelligence Hub
    AI 추론, 프롬프트 관리, 액션 태그 파싱을 전담하는 모듈.
    """

    def __init__(self, broadcast_callback=None):
        self.broadcast_callback = broadcast_callback

    def fallback_to_ai(
        self,
        text: str,
        context_data: Optional[dict] = None,
        target_id: Optional[str] = None,
        with_search=True,
        model="gemini",
        lang: Optional[str] = None,
        user_input: Optional[str] = None,
        extra_instruction: str = "",
        action_prompts: Optional[dict] = None,
        action_handlers: Optional[dict] = None,
        restrict_to_plugin_id: Optional[str] = None,
        sid: Optional[str] = None,
    ):
        """AI Hub 연동 및 응답 처리 핵심 로직"""
        logger.debug(
            f"[IntelligenceHub] 👉 AI Query initiated for: {text} (Target: {target_id}, Context: {restrict_to_plugin_id})"
        )

        logger.info(f"AI Fallback Query (sid={sid}): {text[:50]}...")
        try:
            # 1. 플러그인 컨텍스트 수집 (제한된 플러그인이 있으면 그 정보만 수집)
            settings = load_settings()
            tz_name = settings.get("timezone", "Asia/Seoul")
            try:
                tz = pytz.timezone(tz_name)
            except Exception:
                tz = pytz.timezone("Asia/Seoul")
                tz_name = "Asia/Seoul"

            now_tz = datetime.now(tz)
            current_time = now_tz.strftime("%Y-%m-%d %H:%M:%S")

            # [v3.7.2] 전용 플러그인 프롬프트 우선 로드
            plugin_specific_prompt = ""
            if restrict_to_plugin_id:
                plugin_specific_prompt = load_plugin_ai_prompt(restrict_to_plugin_id)

            # 프롬프트 로드 (기본 페르소나 및 시스템 컨텍스트)
            persona_prompt = load_prompt("01_persona.md")
            system_context_template = load_prompt("02_system_context.md")

            # 하이브리드 모드 시 플러그인 전용 지침이 있으면 그것을 우선, 없으면 기본 extra_instruction 사용
            role_context = plugin_specific_prompt or extra_instruction

            system_prompt = system_context_template.format(
                current_time=current_time,
                tz_name=tz_name,
                role_context=role_context,
            )

            ai_instruction = f"{persona_prompt}\n\n{system_prompt}\n"

            # [v3.8.1] 언어 설정 강제 (브리핑 언어 불일치 방지)
            lang_setting = lang or load_settings().get("lang", "ko")
            if lang_setting == "ko":
                ai_instruction += "\nCRITICAL: 모든 응답([DISPLAY], [VOICE])은 반드시 **한국어**로 작성하십시오.\n"
            else:
                ai_instruction += (
                    f"\nCRITICAL: YOU MUST RESPOND IN {lang_setting.upper()}.\n"
                )

            # [v3.7.1] PluginRegistry에서 통합 시스템 액션 지침 수집 (필터링 지원)
            from services.plugin_registry import get_all_actions

            reg_handlers, reg_prompts = get_all_actions(plugin_id=restrict_to_plugin_id)

            # [v3.7.5] 기존 legacy action_prompts도 필터링 조건이 있을 경우 배제 시도
            # (BotManager에 직접 등록된 것들은 plugin_id 정보가 부족할 수 있으므로 주의)
            combined_prompts = reg_prompts
            combined_handlers = reg_handlers

            if not restrict_to_plugin_id:
                combined_prompts.update(action_prompts or {})
                combined_handlers.update(action_handlers or {})

            if combined_prompts:
                ai_instruction += "\n[AVAILABLE ACTIONS]\n"
                # [v3.8.0] 앨리어싱 지침 강화 및 동적 프롬프트 전면 적용
                if restrict_to_plugin_id:
                    ai_instruction += f"(Context: 이 사용자 요청은 오직 {restrict_to_plugin_id} 플러그인의 범위 내에서 처리되어야 합니다. 타 플러그인의 액션 태그를 절대 사용하지 마십시오.)\n"

                for key, part in combined_prompts.items():
                    ai_instruction += f"{part}\n"

            response_format = load_prompt("04_response_format.md")
            if response_format:
                ai_instruction += f"\n\n{response_format}\n"

            # AI 질의 수행
            ai_result = ai_service.query_ai(
                text,
                source_key=model,
                system_instruction=ai_instruction,
                context_data=context_data,
                is_system=True,
                with_search=with_search,
            )

            if ai_result.get("status") == "success":
                display_text = ai_result.get(
                    "display", get_i18n("bot.ai_error_no_response", lang=lang)
                )
                briefing_text = ai_result.get("briefing") or display_text
                raw_response = ai_result.get("raw") or display_text

                # 동적 액션 핸들러 처리
                action_triggered = False
                for action_key, handler in combined_handlers.items():
                    key_alt = action_key.replace("_", "")
                    pattern = rf"\[ACTION\]\s*({re.escape(action_key)}|{re.escape(key_alt)}):\s*(.*?)(?:\n|$)"

                    match = re.search(pattern, raw_response, re.IGNORECASE)
                    if match:
                        action_data = match.group(2).strip()
                        logger.debug(f"[IntelligenceHub] 🎯 Action Triggered: {action_key}")
                        try:
                            handler(action_data, target_id)
                            action_triggered = True
                        except Exception as e:
                            logger.error(f"Action handler error ({action_key}): {e}")

                # 정제된 텍스트 생성
                clean_display = re.sub(
                    r"\[ACTION\].*?$", "", display_text, flags=re.DOTALL | re.IGNORECASE
                ).strip()
                clean_briefing = re.sub(
                    r"\[ACTION\].*?$",
                    "",
                    briefing_text,
                    flags=re.DOTALL | re.IGNORECASE,
                ).strip()

                # TTS 생성
                audio_url = voice_service.generate_cached_tts(clean_briefing)

                # HUD 이벤트 전송 (콜백 사용)
                if self.broadcast_callback:
                    self.broadcast_callback(
                        "ai_chat",
                        {
                            "input": user_input or text,
                            "response": clean_display,
                            "briefing": clean_briefing,
                            "audio_url": audio_url,
                            "visual_type": ai_result.get("visual_type", "ai"),
                            "motion": "happy"
                            if ai_result.get("sentiment") == "positive"
                            else "neutral",
                        },
                        sid=sid,
                    )

                return {"text": clean_display}
            else:
                return {
                    "text": f"{get_i18n('bot.ai_fallback_error', lang=lang)}: {ai_result.get('message')}"
                }

        except Exception as e:
            logger.error(f"AI Fallback Error: {e}")
            return {"text": f"{get_i18n('bot.ai_system_error', lang=lang)}: {str(e)}"}
