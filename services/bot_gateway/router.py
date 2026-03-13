import re
import logging
from typing import Optional, Dict
from utils import get_i18n

logger = logging.getLogger(__name__)


class MessageRouter:
    """메시지 분석 및 라우팅 핵심 모듈"""

    def __init__(self, manager):
        self.manager = manager

    def handle(
        self,
        platform: str,
        user_id: str,
        text: str,
        target_id: Optional[str] = None,
        model: str = "gemini",
        lang: Optional[str] = None,
        sid: Optional[str] = None,
    ) -> Dict:
        if not target_id:
            target_id = user_id

        if not self.manager.access.is_user_allowed(platform, user_id):
            return {"text": get_i18n("bot.unauthorized", lang=lang)}

        # 1. 보고서/리포트 키워드 선처리
        if "리포트" in text or "보고" in text:
            return self._execute_report_logic(text, lang, sid)

        # 2. 명령어 라우팅 (/)
        if text.startswith("/"):
            return self._handle_slash_command(text, target_id, model, lang, platform, sid)

        # 3. 검색 전용 (#)
        if text.startswith("#"):
            return self.manager.executor.run_ai_fallback(
                text, target_id, model=model, lang=lang, sid=sid
            )

        # 4. 일반 AI 대화 (@ 멘션 포함)
        return self._handle_general_conversation(text, target_id, model, lang, sid)

    def _execute_report_logic(self, text, lang, sid):
        from services.visualizer import visualizer

        report_path = visualizer.create_report_card(
            title="AEGIS Tactical Report",
            content=f"'{text}' 분석 완료.",
            emotion="happy",
        )
        self.manager.broadcast_to_hud(
            "system_report", {"title": "Tactical Report Generated"}, sid=sid
        )
        return {
            "text": get_i18n("bot.report_generated", lang=lang),
            "image": report_path,
        }

    def _handle_slash_command(self, text, target_id, model, lang, platform, sid):
        cmd_payload = text[1:].strip()
        parts = cmd_payload.split(" ", 1)
        cmd_root = parts[0].strip().lower()
        remaining = parts[1].strip() if len(parts) > 1 else ""

        if cmd_root in ["help", "도움말", "?"]:
            logger.info(f"[Router] Help command recognized (Platform: {platform})")
            from services.plugin_registry import get_unified_help_markdown

            try:
                help_text = get_unified_help_markdown(lang=lang, platform=platform)
                return {"text": help_text}
            except Exception as e:
                logger.error(f"[Router] Error generating help: {e}", exc_info=True)
                return {"text": f"❌ 도움말 생성 중 오류가 발생했습니다: {str(e)}"}

        is_hybrid = cmd_root.startswith("@")
        if is_hybrid:
            cmd_root = cmd_root[1:]

        from services.plugin_registry import (
            get_context_aliases,
            get_plugin_context_data,
            get_action_by_command,
        )

        alias_map = get_context_aliases()
        target_plugin_id = alias_map.get(cmd_root)

        if target_plugin_id:
            sub_parts = remaining.split(" ", 1)
            action_keyword = sub_parts[0].strip().lower()
            action_params = sub_parts[1].strip() if len(sub_parts) > 1 else ""

            # [Fix] Handle case where no action keyword was typed (like just `/날씨`)
            if not action_keyword:
                # [v4.1.7] Try default actions (Zero Bug UX)
                defaults = ["list", "ls", "ls", "briefing", "brief", "get"]
                for d in defaults:
                    action_info = get_action_by_command(d, plugin_id=target_plugin_id)
                    if action_info:
                        action_keyword = d # use the found default
                        break

            action_info = get_action_by_command(
                action_keyword, plugin_id=target_plugin_id
            )
            
            # [v4.2.10] Fallback: 알리아스 계층에서 못 찾으면 전역 검색 시도 (Zero-Maintenance)
            # 예: '/날씨' 입력 시 '날씨'는 알리아스지만, 하위 액션이 없으면 전역 '날씨' 명령어로 실행
            if not action_info:
                action_info = get_action_by_command(cmd_root)
                if action_info:
                    action_params = remaining # 인자 복구

            logger.debug(f"[Router Debug] target_plugin_id={target_plugin_id}, action_keyword={action_keyword}, action_info={action_info}")
            
            if action_info:
                result_msg = self.manager.executor.execute_deterministic_action(
                    action_info, action_params, target_id, platform, lang, sid
                )
                if result_msg:
                    return result_msg

            if not is_hybrid:
                msg = get_i18n("bot.unknown_command", lang=lang)
                # Avoid duplicate labels like '할일 할일'
                display_action = action_keyword if action_keyword != cmd_root else ""
                return {"text": msg.format(root=cmd_root, action=display_action).replace("  ", " ").strip()}

            # [v3.7.2] @(하이브리드) 지원 여부 체크 (Zero-Maintenance)
            from services.bot_intelligence import has_plugin_ai_prompt

            if not has_plugin_ai_prompt(target_plugin_id):
                msg = get_i18n("bot.hybrid_not_supported", lang=lang)
                return {"text": msg.replace("{plugin}", target_plugin_id)}

            # AI Hybrid Fallback (프롬프트는 IntelligenceHub에서 자동 로드)
            plugin_data = get_plugin_context_data(plugin_ids=[target_plugin_id])

            return self.manager.executor.run_ai_fallback(
                remaining or get_i18n("bot.default_briefing", lang=lang),
                context_data=plugin_data,
                target_id=target_id,
                with_search=is_hybrid,
                model=model,
                lang=lang,
                restrict_to_plugin_id=target_plugin_id,
                sid=sid,
            )

        action_info = get_action_by_command(cmd_root)
        if action_info:
            result_msg = self.manager.executor.execute_deterministic_action(
                action_info, remaining, target_id, platform, lang, sid
            )
            if result_msg:
                return result_msg

        return {
            "text": get_i18n("bot.unknown_command", lang=lang).format(
                root=cmd_root, action=""
            )
        }

    def _handle_general_conversation(self, text, target_id, model, lang, sid):
        context_data = {}
        if "@" in text:
            from services.plugin_registry import (
                get_plugin_context_data,
                get_context_aliases,
            )

            mentions = set(re.findall(r"@([가-힣a-zA-Z0-9_]+)", text))
            if mentions:
                alias_map = get_context_aliases()
                target_ids = [alias_map.get(m, m) for m in mentions]
                context_data = get_plugin_context_data(plugin_ids=target_ids)

        return self.manager.executor.run_ai_fallback(
            text, context_data=context_data, target_id=target_id, model=model, lang=lang, sid=sid
        )
