import abc
from typing import List, Optional, Dict
import logging
from .socket_service import emit_to_hud
from .visualizer import visualizer
from . import ai_service
import re
import pytz
from datetime import datetime
from utils import get_i18n, load_settings

logger = logging.getLogger(__name__)


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


class BotManager:
    """
    AEGIS Messaging Hub
    멀티 플랫폼 봇들을 관리하고 명령어를 라우팅하는 중앙 제어 서비스.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BotManager, cls).__new__(cls)
            cls._instance.adapters: Dict[str, BotAdapter] = {}
            cls._instance.allowed_users: Dict[
                str, List[str]
            ] = {}  # platform -> [user_ids]
            cls._instance.action_handlers = {}  # [v3.0.0] 동적 액션 핸들러
            cls._instance.action_prompts = {}  # [v3.1.0] 액션별 프롬프트 저장소

            # [v3.0.1] 하드코딩된 알람 콜백 연결 제거 (이제 플러그인이 직접 등록함)

        return cls._instance

    def register_action_handler(
        self, action_key: str, handler_func, prompt_instruction: Optional[str] = None
    ):
        """
        플러그인에서 시스템 액션(예: SET_ALARM) 및 지침을 등록.
        handler_func(action_data, target_id) 형태로 호출됨.
        """
        key = action_key.upper()
        self.action_handlers[key] = handler_func
        if prompt_instruction:
            self.action_prompts[key] = prompt_instruction
        logger.info(
            f"[BotManager] Action Registered: {key} (Has Prompt: {bool(prompt_instruction)})"
        )

    def register_adapter(self, adapter: BotAdapter):
        name = adapter.platform_name()
        self.adapters[name] = adapter
        logger.info(f"Bot Adapter Registered/Updated: {name}")

    def set_allowed_users(self, platform: str, user_ids: List[str]):
        self.allowed_users[platform] = user_ids

    def is_user_allowed(self, platform: str, user_id: str) -> bool:
        allowed = self.allowed_users.get(platform, [])
        # ID를 문자열로 정규화하여 비교
        return str(user_id) in [str(uid) for uid in allowed]

    def handle_incoming_message(
        self,
        platform: str,
        user_id: str,
        text: str,
        target_id: Optional[str] = None,
        model: str = "gemini",
        lang: str = None,
    ) -> Dict:
        """
        외부에서 들어온 메시지를 처리하는 핵심 루틴
        target_id: 메시지가 갈 목적지 (디스코드 채널 ID 등). 누락 시 user_id 사용.
        """
        if not target_id:
            target_id = user_id

        print(
            f"[BotManager] 📡 Handling incoming message on {platform} from user {user_id} (Target: {target_id})"
        )
        if not self.is_user_allowed(platform, user_id):
            logger.warning(f"Unauthorized access attempt: {platform} - {user_id}")
            print(
                f"[BotManager] 🚫 Unauthorized access attempt: {platform} - {user_id}"
            )
            return {"text": "Unauthorized access. Please contact the administrator."}

        logger.info(f"Message from {platform}/{user_id}: {text}")

        # 테스트용: "리포트"라는 단어가 포함되면 비주얼 리포트 생성
        if "리포트" in text or "보고" in text:
            print("[BotManager] 📊 리포트 생성 트리거")
            report_path = visualizer.create_report_card(
                title="AEGIS Tactical Report",
                content=f"'{text}'에 대한 분석을 완료했습니다.\n현재 시스템 상태는 정상이며,\n데스크탑 HUD와 동기화되었습니다.",
                emotion="happy",
            )
            # HUD 동기화 시뮬레이션
            self.broadcast_to_hud(
                "system_report", {"title": "Tactical Report Generated"}
            )
            return {"text": "분석 리포트를 생성했습니다.", "image": report_path}

        # 1.1단계: 전역 알리아스 기반 슬래시 명령어 동적 처리 (Hardcoding 배제)
        if text.startswith("/"):
            print("[BotManager] ⚙️ Dynamic Command Router")
            from .plugin_registry import get_context_aliases, get_plugin_context_data

            cmd_payload = text[1:].strip()
            cmd_part = cmd_payload.split()[0].lower()

            is_hybrid = cmd_payload.startswith("@")
            if is_hybrid:
                cmd_part = cmd_part[1:]
                actual_text = re.sub(
                    rf"^/@{cmd_part}\s*", "", text, flags=re.IGNORECASE
                ).strip()
            else:
                actual_text = re.sub(
                    rf"^/{cmd_part}\s*", "", text, flags=re.IGNORECASE
                ).strip()

            # [v3.2.1] 텍스트가 비어있을 경우(단순 명령 호출) 기본 브리핑 요청 부여
            if not actual_text:
                actual_text = get_i18n("bot.default_briefing", lang=lang)

            # 헬프 커맨드는 공통 처리
            if cmd_part in ["help", "도움말", "?"]:
                return self._execute_system_command(text)

            # 등록된 플러그인 알리아스 확인 (예: /뉴스 -> news)
            alias_map = get_context_aliases()
            target_plugin_id = alias_map.get(cmd_part)

            if target_plugin_id:
                print(
                    f"[BotManager] 🎯 Dynamic Alias matched: {'/@' if is_hybrid else '/'}{cmd_part} -> {target_plugin_id}"
                )
                plugin_data = get_plugin_context_data(
                    plugin_ids=[target_plugin_id], timeout=5
                )

                if is_hybrid:
                    # [/@] 하이브리드: AI 검색 허용 + 로컬 데이터 참조
                    prompt_tmpl = get_i18n("bot.hybrid_instruction", lang=lang)
                    prompt = (
                        f"{prompt_tmpl.replace('{plugin}', cmd_part)}\n\n"
                        f"[{get_i18n('bot.user_request_label', lang=lang)}]: {actual_text}"
                    )
                    use_search = True
                else:
                    # [/] 로컬 전용: AI 검색 차단 + 오직 로컬 데이터만 보고
                    prompt = (
                        f"{get_i18n('bot.local_instruction', lang=lang)}\n\n"
                        f"[{get_i18n('bot.user_request_label', lang=lang)}]: {actual_text}"
                    )
                    use_search = False

                return self._fallback_to_ai(
                    prompt,
                    context_data=plugin_data,
                    target_id=target_id,
                    with_search=use_search,
                    model=model,
                    lang=lang,
                )

            # 매칭되는 알리아스가 없으면 기존 시스템 커맨드 로직으로 폴백
            return self._execute_system_command(text, lang=lang)

        # 1.5단계: 웹 검색 강제 (#)
        if text.startswith("#"):
            print("[BotManager] 🌐 External Search Router")
            search_query = text[1:].strip()
            return self._fallback_to_ai(
                f"#{search_query}", target_id=target_id, model=model, lang=lang
            )

        # 1.6단계: 플러그인 컨텍스트 수집 (@)
        context_data = {}
        if "@" in text:
            from .plugin_registry import get_plugin_context_data, get_context_aliases

            mentions = set(re.findall(r"@([가-힣a-zA-Z0-9_]+)", text))
            if mentions:
                alias_map = get_context_aliases()
                target_ids = [alias_map.get(m, m) for m in mentions]
                context_data = get_plugin_context_data(plugin_ids=target_ids, timeout=5)
                print(f"[BotManager] 💉 Context injected for bot: {target_ids}")

        # 2단계/3단계: NLP 및 AI 연동
        print("[BotManager] 🧠 AI Assistant Router")
        return self._fallback_to_ai(
            text, context_data=context_data, target_id=target_id, model=model, lang=lang
        )

    def _execute_system_command(self, cmd_text: str, lang: str = None):
        """
        슬래시 명령어 처리기
        """
        cmd_part = cmd_text[1:].split()[0].lower()
        print(f"[BotManager] 👉 executing system command: {cmd_part}")

        if cmd_part in ["help", "도움말", "?"]:
            from .plugin_registry import get_unified_help_markdown

            return {"text": get_unified_help_markdown()}

        if cmd_part in ["보고", "리포트", "report"]:
            return self.handle_incoming_message(
                "internal", "system", "현재 리포트 생성해줘"
            )

        # 브로드캐스트는 그대로 유지 (HUD 반응용)
        self.broadcast_to_hud("system_command", {"command": cmd_text})
        return {
            "text": f"{get_i18n('bot.system_command_received', lang=lang)}: {cmd_text}\n{get_i18n('bot.hud_refer_briefing', lang=lang)}"
        }

    def _fallback_to_ai(
        self,
        text: str,
        context_data: Optional[dict] = None,
        target_id: Optional[str] = None,
        with_search=True,
        model="gemini",
        lang: str = None,
    ):
        """
        AI Hub 연동 (gemini-2.0-flash 등)
        """
        print(f"[BotManager] 👉 AI Query initiated for: {text} (Target: {target_id})")

        try:
            # [v3.4.2] 타임존 인식형 시스템 시각 구성
            settings = load_settings()
            tz_name = settings.get("timezone", "Asia/Seoul")  # 기본값 KST
            try:
                tz = pytz.timezone(tz_name)
            except Exception:
                tz = pytz.timezone("Asia/Seoul")
                tz_name = "Asia/Seoul"

            now_tz = datetime.now(tz)
            current_time = now_tz.strftime("%Y-%m-%d %H:%M:%S")

            # 기본 Persona 및 공통 지침
            ai_instruction = f"""{get_i18n("bot.persona", lang=lang)}
{get_i18n("bot.current_time_label", lang=lang)}: {current_time} ({tz_name})
{get_i18n("bot.polite_instruction", lang=lang)}
{get_i18n("bot.timezone_importance", lang=lang).replace("{tz}", tz_name)}
"""
            # 등록된 모든 플러그인 액션 지침 추가
            if self.action_prompts:
                ai_instruction += (
                    f"\n{get_i18n('bot.executable_actions_label', lang=lang)}\n"
                )
                for key, part in self.action_prompts.items():
                    ai_instruction += f"- {part}\n"

            print(f"[BotManager] 🛠️ Final System Instruction:\n{ai_instruction}")

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

                print(f"[BotManager] 🧠 AI Raw Response: {display_text}")

                # [v3.0.0] 동적 액션 핸들러 처리
                # AI 응답 내의 모든 [ACTION] 태그를 찾아 등록된 핸들러로 전달
                action_triggered = False
                for action_key, handler in self.action_handlers.items():
                    # [v3.2.2] 태그 파싱 유연화: 언더바(_) 유무에 상관없이 매칭 (AI의 오타/누락 대응)
                    key_alt = action_key.replace("_", "")
                    pattern = rf"\[ACTION\]\s*({re.escape(action_key)}|{re.escape(key_alt)}):\s*(.*?)(?:\n|$)"
                    match = re.search(pattern, display_text, re.IGNORECASE)
                    if match:
                        action_data = match.group(2).strip()
                        print(
                            f"[BotManager] 🎯 Dynamic Action Triggered: {action_key} with data: {action_data}"
                        )
                        try:
                            # 핸들러 실행 (데이터, 타겟 ID 전달)
                            handler(action_data, target_id)
                            action_triggered = True
                        except Exception as e:
                            logger.error(f"Action handler error ({action_key}): {e}")

                if not action_triggered:
                    print(
                        "[BotManager] ⚠️ No system actions were parsed from the AI response."
                    )

                # 정제된 텍스트 생성 (모든 [ACTION] 태그 제거)
                clean_display = re.sub(
                    r"\[ACTION\].*?$", "", display_text, flags=re.DOTALL | re.IGNORECASE
                ).strip()
                clean_briefing = re.sub(
                    r"\[ACTION\].*?$",
                    "",
                    briefing_text,
                    flags=re.DOTALL | re.IGNORECASE,
                ).strip()

                # 2. 결과 HUD로 브로드캐스트
                self.broadcast_to_hud(
                    "ai_chat",
                    {
                        "input": text,
                        "response": clean_display,
                        "briefing": clean_briefing,
                        "motion": "happy"
                        if ai_result.get("sentiment") == "positive"
                        else "neutral",
                    },
                )

                return {"text": clean_display}
            else:
                return {
                    "text": f"{get_i18n('bot.ai_fallback_error', lang=lang)}: {ai_result.get('message')}"
                }

        except Exception as e:
            print(f"[BotManager] ❌ AI Fallback Error: {e}")
            import traceback

            traceback.print_exc()
            return {"text": f"{get_i18n('bot.ai_system_error', lang=lang)}: {str(e)}"}

    def broadcast_to_hud(self, event_type: str, data: dict):
        """데스크탑 HUD로 실시간 이벤트 전송 (Socket.IO 연동 포인트)"""
        print(
            f"[BotManager] 🌐 Broadcasting to HUD Socket event '{event_type}': {data}"
        )
        emit_to_hud(event_type, data)


bot_manager = BotManager()
