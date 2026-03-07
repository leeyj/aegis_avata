import json
import os
import logging
from utils import load_json_config, load_settings, strip_markdown_wrappers
from routes.config import PLUGINS_DIR, GEMINI_API_KEY

# 로깅 설정
logger = logging.getLogger(__name__)

# [Lint Noise Resolution] IDE 인식률 향상을 위한 처리
try:
    from google import genai
    from google.genai import types
except ImportError:
    logger.warning("google-genai package not found. AI features will be limited.")
    genai = None
    types = None


def _get_lang():
    """현재 시스템 언어 설정을 로드합니다."""
    settings = load_settings()
    return settings.get("lang", "ko")


def _load_plugin_prompt(plugin_id, task):
    """특정 플러그인 폴더 내의 프롬프트를 로드합니다."""
    lang = _get_lang()
    plugin_prompt_path = os.path.join(PLUGINS_DIR, plugin_id, "prompts.json")

    if os.path.exists(plugin_prompt_path):
        try:
            prompts = load_json_config(plugin_prompt_path)
            # 언어 코드 탐색 -> 전역 탐색
            return prompts.get(lang, {}).get(task) or prompts.get(task)
        except Exception as e:
            print(f"[Gemini] Error loading prompt from {plugin_id}: {e}")
    return None


def get_briefing(api_key, context_data, debug_mode=False):
    """
    대시보드 전술 브리핑 생성 (Schemas 강제 적용)
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"

    prompt_tpl = _load_plugin_prompt("proactive-agent", "dashboard_briefing")
    if not prompt_tpl:
        prompt_tpl = "Analyze context and provide strategic briefing: {{context_data}}"

    print(f"[Gemini] Briefing request for: {list(context_data.keys())}")
    context_str = json.dumps(context_data, ensure_ascii=False, indent=2)

    # [AI Validation Layer] 데이터의 부정확성이나 오류(status: error)를 감지하고 상식적으로 판단하도록 가이드 추가
    validation_guide = "\n\nCRITICAL: Analyze the provided 'context_data' for any anomalies or explicit error reports (e.g., status: error). If a plugin's data looks corrupted or unrealistic, acknowledge the connectivity issue instead of providing false information."
    prompt = prompt_tpl.replace("{{context_data}}", context_str) + validation_guide
    print(f"[Gemini] Final prompt length: {len(prompt)} chars")

    config = types.GenerateContentConfig(
        tools=[],  # Prevent "Search tool" conflict
        response_mime_type="application/json",
        response_schema={
            "type": "object",
            "properties": {
                "briefing": {
                    "type": "string",
                    "description": "상황에 대한 5~10문장의 전문적이고 상세한 전술 보고서 (마크다운 가능)",
                },
                "voice": {
                    "type": "string",
                    "description": "사용자에게 음성으로 들려줄 2~3문장의 따뜻하고 친절한 요약 (존댓말 사용)",
                },
                "sentiment": {
                    "type": "string",
                    "description": "현재 상황에 가장 적합한 감정 상태",
                    "enum": ["happy", "neutral", "serious", "alert"],
                },
                "visual_type": {
                    "type": "string",
                    "description": "강조해야 할 정보의 유형",
                    "enum": ["weather", "finance", "calendar", "email", "none"],
                },
            },
            "required": ["briefing", "voice", "sentiment", "visual_type"],
        },
    )

    try:
        print("[Gemini] Requesting content generation from Gemini...")
        response = client.models.generate_content(
            model=model_id, contents=prompt, config=config
        )
        print(f"[Gemini] Response received. Raw text: {response.text}")
        res = response.parsed
        # [v3.0] 필터링 규칙 강제 적용
        display_raw = res.get("briefing", "")
        voice_raw = res.get("voice") or display_raw

        print(f"[Gemini] Parsed briefing length: {len(display_raw)} chars")

        result_dict = {
            "display": strip_markdown_wrappers(display_raw),
            "briefing": strip_markdown_wrappers(voice_raw),
            "sentiment": res.get("sentiment", "neutral"),
            "visual_type": res.get("visual_type", "none"),
        }

        if debug_mode:
            result_dict["debug_prompt"] = prompt
            try:
                result_dict["debug_response"] = json.loads(
                    strip_markdown_wrappers(response.text)
                )
            except Exception:
                result_dict["debug_response"] = response.text

        return result_dict
    except Exception as e:
        print(f"[Gemini] Briefing Schema Error: {e}")
        return {
            "display": "Briefing analysis failed.",
            "briefing": "Analysis failed.",
            "sentiment": "neutral",
            "visual_type": "none",
        }


def get_plugin_briefing(api_key, plugin_id, task, data):
    """
    플러그인 전용 AI 서비스 (Schemas 강제 적용)
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"

    prompt_tpl = _load_plugin_prompt(plugin_id, task)
    if not prompt_tpl:
        prompt_tpl = f"Analyze data for {plugin_id}: {{data}}"

    data_str = json.dumps(data, ensure_ascii=False, indent=2)
    prompt = prompt_tpl.replace("{{data}}", data_str)

    config = types.GenerateContentConfig(
        tools=[],  # Prevent "Search tool" conflict
        response_mime_type="application/json",
        response_schema={
            "type": "object",
            "properties": {
                "display": {"type": "string"},
                "voice": {"type": "string"},
                "sentiment": {
                    "type": "string",
                    "enum": ["happy", "neutral", "serious", "alert"],
                },
            },
            "required": ["display", "voice", "sentiment"],
        },
    )

    try:
        response = client.models.generate_content(
            model=model_id, contents=prompt, config=config
        )
        res = response.parsed
        d_raw = res.get("display", "")
        v_raw = res.get("voice") or d_raw

        return {
            "display": strip_markdown_wrappers(d_raw),
            "briefing": strip_markdown_wrappers(v_raw),
            "sentiment": res.get("sentiment", "neutral"),
        }
    except Exception as e:
        print(f"[Gemini] Plugin Briefing Schema Error: {e}")
        return {
            "display": "Task analysis failed.",
            "briefing": "Analysis failed.",
            "sentiment": "neutral",
        }


def get_widget_briefing(api_key, widget_type, widget_data):
    """
    특정 위젯 전용 요약 보고 (각 위젯 플러그인 프롬프트 사용)
    """
    return get_plugin_briefing(api_key, widget_type, "widget_briefing", widget_data)


def process_command(api_key, command, context_data):
    """
    [v2.5.1] 지능형 에이전트 + 상세 로깅 시스템 (De-hardcoded v3.0)
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"

    print(f"\n{'=' * 50}\n[AGENT START] Command: {command}\n{'=' * 50}")

    # [v2.5.1] 도구 1: 내부 시스템 컨텍스트 조회 (정제 필수)
    def get_internal_system_data():
        """내부 위젯의 현재 상태 및 시스템 컨텍스트를 조회합니다."""
        print("[Agent] >>> Tool Call: get_internal_system_data")
        from utils import sanitize_context_data

        clean_data = sanitize_context_data(context_data)
        print(f"[Agent] <<< Sanitized Data for: {list(clean_data.keys())}")
        return clean_data

    # [v2.5.1] 도구 2: 외부 웹 검색 대행
    def search_the_web(query: str):
        """실시간 정보 검색을 수행합니다."""
        print(f"[Agent] >>> Tool Call: search_the_web (Query: {query})")
        search_config = types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            system_instruction="Explain results shortly based on search.",
        )
        try:
            sub_res = client.models.generate_content(
                model=model_id,
                contents=f"Search result for: {query}",
                config=search_config,
            )
            return sub_res.text
        except Exception as e:
            return f"Error: {str(e)}"

    # [v3.0] 동적 프롬프트 로딩 및 플레이스홀더 치환
    from datetime import datetime

    available_modules = list(context_data.keys())
    current_time = datetime.now().strftime("%H:%M:%S")

    system_instruction = _load_plugin_prompt("terminal", "command_parsing")
    if not system_instruction:
        system_instruction = "You are a tactical assistant. Use tools if needed."

    system_instruction = (
        system_instruction.replace("{{current_time}}", current_time)
        .replace("{{modules}}", ", ".join(available_modules))
        .replace("{{context_data}}", "INTERNAL_TOOL")
    )

    try:
        chat = client.chats.create(
            model=model_id,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[get_internal_system_data, search_the_web],
                response_mime_type="application/json",
                response_schema={
                    "type": "object",
                    "properties": {
                        "response": {"type": "string"},
                        "briefing": {"type": "string"},
                        "action": {
                            "type": "string",
                            "enum": ["navigate", "toggle", "search", "none"],
                        },
                        "target": {"type": "string"},
                        "sentiment": {
                            "type": "string",
                            "enum": ["happy", "neutral", "serious", "alert"],
                        },
                    },
                    "required": ["response", "action", "sentiment"],
                },
            ),
        )

        response = chat.send_message(command)
        result = response.parsed

        if not result:
            raw_text = getattr(response, "text", "") or ""
            if not raw_text:
                raise Exception("Empty AI response.")
            result = json.loads(strip_markdown_wrappers(raw_text))

        # [v3.0] 모든 출력 필드에 필터링 강제
        resp_clean = strip_markdown_wrappers(result.get("response", ""))
        brief_clean = strip_markdown_wrappers(
            result.get("briefing") or result.get("response", "")
        )

        print(f"[Agent] Decision Logged.\n{'=' * 50}\n[AGENT END]\n{'=' * 50}")

        return {
            "display": resp_clean,
            "briefing": brief_clean,
            "action": result.get("action", "none"),
            "target": result.get("target", ""),
            "sentiment": result.get("sentiment", "neutral"),
        }

    except Exception as e:
        print(f"[Gemini] !!! Agent Error: {e}")
        return {
            "display": "Agent error occurred.",
            "briefing": "Processing failed.",
            "action": "none",
            "sentiment": "serious",
        }


def get_custom_response(api_key, prompt, with_search=True, system_instruction=None):
    """기존 ad-hoc 질의 유지 (Search 도구 지원 추가)"""
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"

    config = {}
    tools = []
    if with_search:
        tools.append(types.Tool(google_search=types.GoogleSearch()))

    config = types.GenerateContentConfig(
        tools=tools, system_instruction=system_instruction
    )

    try:
        response = client.models.generate_content(
            model=model_id, contents=prompt, config=config
        )
        text = response.text.strip()

        # [v2.3.4] JSON 응답 감지 및 파싱 시도 (Tag 기반 dual response 처리 강화)
        if "[DISPLAY]" in text or "[VOICE]" in text:
            return text  # ai_service에서 _parse_dual_response로 처리됨

        # Try JSON parsing if it looks like JSON
        if text.startswith("```json"):
            cleaned = text[7:-3].strip()
            try:
                return json.loads(cleaned)
            except Exception:
                pass
        elif text.startswith("{") and text.endswith("}"):
            try:
                return json.loads(text)
            except Exception:
                pass

        # Normal text fallback (Strip markdown wrappers if any)
        clean_text = strip_markdown_wrappers(text)

        return {
            "display": clean_text,
            "briefing": clean_text,
            "status": "success",
            "sentiment": "neutral",
        }
    except Exception as e:
        print(f"[Gemini] Custom Error: {e}")
        return {
            "display": f"Error during analysis: {e}",
            "briefing": f"Error during analysis: {e}",
            "sentiment": "neutral",
            "status": "error",
        }


def query_gemini(prompt, system_instruction=None, with_search=True):
    # 일반 질의 시 Search 기능을 기본 활성화하여 최신 정보(날씨 등) 검색 보장
    res = get_custom_response(
        GEMINI_API_KEY,
        prompt,
        with_search=with_search,
        system_instruction=system_instruction,
    )
    if isinstance(res, str):
        return {"response": res}  # _parse_dual_response용 원문 전달
    if "text" in res and "response" not in res:
        res["response"] = res["text"]
    return res
