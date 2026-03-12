import json
import logging
from datetime import datetime
from utils import load_json_config, load_settings
from routes.config import PLUGINS_DIR, GEMINI_API_KEY

from .ai_base import ai_base, types
from .ai_schemas import BRIEFING_SCHEMA, COMMAND_SCHEMA
from .ai_tools import get_internal_system_data, search_the_web

logger = logging.getLogger(__name__)


def _get_lang():
    settings = load_settings()
    return settings.get("language", "ko")


def _load_plugin_prompt(plugin_id, task):
    import os

    # 1. 지원되는 언어 확인
    lang = _get_lang()

    # 2. JSON 기반 프롬프트 로드 시도 (최신 Plugin-X 권장)
    json_path = os.path.join(PLUGINS_DIR, plugin_id, "prompts.json")
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get(lang, {}).get(task) or data.get("ko", {}).get(task)
        except Exception:
            pass

    # 3. MD 기반 프롬프트 로드 시도 (하위 호환)
    path = os.path.join(PLUGINS_DIR, plugin_id, "prompts", f"{task}.md")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()

    return None


def get_briefing(api_key, context_data, debug_mode=False):
    """대시보드 전술 브리핑 생성"""
    client = ai_base.client
    model_id = ai_base.model_id

    prompt_tpl = (
        _load_plugin_prompt("proactive-agent", "dashboard_briefing")
        or "Analyze context: {{context_data}}"
    )
    context_str = json.dumps(context_data, ensure_ascii=False, indent=2)

    lang = _get_lang()
    language_instruction = (
        "\n\nCRITICAL: You MUST respond in KOREAN."
        if lang == "ko"
        else f"\n\nCRITICAL: You MUST respond in {lang}."
    )

    validation_guide = f"{language_instruction}\n\nAnalyze for any anomalies. Acknowledge connectivity issues if data looks corrupted."
    prompt = prompt_tpl.replace("{{context_data}}", context_str) + validation_guide

    config = types.GenerateContentConfig(
        tools=[],
        response_mime_type="application/json",
        response_schema=BRIEFING_SCHEMA,
    )

    try:
        response = client.models.generate_content(
            model=model_id, contents=prompt, config=config
        )
        res = response.parsed

        display = res.get("briefing", "")
        voice = res.get("voice") or display

        result = {
            "display": ai_base.clean_response(display),
            "briefing": ai_base.clean_response(voice),
            "sentiment": res.get("sentiment", "neutral"),
            "visual_type": res.get("visual_type", "none"),
        }
        if debug_mode:
            result["debug_prompt"] = prompt
        return result
    except Exception as e:
        logger.error(f"Briefing Error: {e}")
        return {
            "display": "Analysis failed.",
            "briefing": "Failed.",
            "sentiment": "neutral",
            "visual_type": "none",
        }


def get_plugin_briefing(api_key, plugin_id, task, data):
    """플러그인 전용 AI 서비스"""
    client = ai_base.client
    prompt_tpl = _load_plugin_prompt(plugin_id, task) or "Analyze: {{data}}"
    prompt = prompt_tpl.replace("{{data}}", json.dumps(data, ensure_ascii=False))

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=BRIEFING_SCHEMA,
    )

    try:
        response = client.models.generate_content(
            model=ai_base.model_id, contents=prompt, config=config
        )
        res = response.parsed
        return {
            "display": ai_base.clean_response(res.get("briefing", "")),
            "voice": ai_base.clean_response(res.get("voice", "")),
            "sentiment": res.get("sentiment", "neutral"),
        }
    except Exception as e:
        logger.error(f"Plugin Briefing Error ({plugin_id}): {e}")
        return {"display": "Error", "voice": "Error", "sentiment": "neutral"}


def get_widget_briefing(api_key, widget_type, widget_data):
    return get_plugin_briefing(api_key, widget_type, "widget_summary", widget_data)


def process_command(api_key, command, context_data):
    """지능형 에이전트 명령어 처리"""
    client = ai_base.client
    model_id = ai_base.model_id

    available_modules = list(context_data.keys())
    current_time = datetime.now().strftime("%H:%M:%S")

    system_instruction = (
        _load_plugin_prompt("terminal", "command_parsing")
        or "You are a tactical assistant."
    )
    system_instruction = (
        system_instruction.replace("{{current_time}}", current_time)
        .replace("{{modules}}", ", ".join(available_modules))
        .replace("{{context_data}}", "INTERNAL_TOOL")
    )

    # 툴 래핑 (현재 컨텍스트 주입)
    def call_get_internal_system_data():
        return get_internal_system_data(context_data)

    def call_search_the_web(query: str):
        return search_the_web(client, query, model_id)

    try:
        chat = client.chats.create(
            model=model_id,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=[call_get_internal_system_data, call_search_the_web],
                response_mime_type="application/json",
                response_schema=COMMAND_SCHEMA,
            ),
        )

        response = chat.send_message(command)
        result = response.parsed or ai_base.parse_json_response(response.text)

        return {
            "display": ai_base.clean_response(result.get("response", "")),
            "briefing": ai_base.clean_response(
                result.get("briefing") or result.get("response", "")
            ),
            "action": result.get("action", "none"),
            "target": result.get("target", ""),
            "sentiment": result.get("sentiment", "neutral"),
        }
    except Exception as e:
        logger.error(f"Agent Error: {e}")
        return {
            "display": "Error occurred.",
            "briefing": "Failed.",
            "action": "none",
            "sentiment": "serious",
        }


def get_custom_response(api_key, prompt, with_search=True, system_instruction=None):
    """기존 ad-hoc 질의 유지"""
    client = ai_base.client
    tools = [types.Tool(google_search=types.GoogleSearch())] if with_search else []

    config = types.GenerateContentConfig(
        tools=tools, system_instruction=system_instruction
    )

    try:
        response = client.models.generate_content(
            model=ai_base.model_id, contents=prompt, config=config
        )
        text = response.text.strip()

        if "[DISPLAY]" in text or "[VOICE]" in text:
            return text

        parsed = ai_base.parse_json_response(text)
        if parsed:
            parsed.update({"status": "success"})
            return parsed

        clean_text = ai_base.clean_response(text)
        return {
            "display": clean_text,
            "briefing": clean_text,
            "status": "success",
            "sentiment": "neutral",
        }
    except Exception as e:
        logger.error(f"Custom Query Error: {e}")
        return {"display": f"Error: {e}", "briefing": "Error", "status": "error"}


def query_gemini(prompt, system_instruction=None, with_search=True):
    res = get_custom_response(
        GEMINI_API_KEY,
        prompt,
        with_search=with_search,
        system_instruction=system_instruction,
    )
    if isinstance(res, str):
        return {"response": res}
    if "text" in res and "response" not in res:
        res["response"] = res["text"]
    return res
