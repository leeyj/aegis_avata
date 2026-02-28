from google import genai
import json
import os
from utils import load_json_config
from routes.config import PROMPTS_CONFIG_PATH, SYSTEM_CONFIG_PATH


def _get_lang():
    """현재 시스템 언어 설정을 로드합니다."""
    sys_config = load_json_config(SYSTEM_CONFIG_PATH)
    return sys_config.get("lang", "ko")


def get_briefing(api_key, context_data):
    """
    Gemini를 사용하여 현재 대시보드 데이터를 기반으로 전술 브리핑 생성 (다국어 지원)
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"
    lang = _get_lang()

    # 외부 프롬프트 로드 (언어 계층 반영)
    prompts = load_json_config(PROMPTS_CONFIG_PATH)
    prompt_tpl = prompts.get(lang, {}).get("DASHBOARD_INTERNAL", {}).get("briefing", "")

    # Fallback to direct key if new structure is not present
    if not prompt_tpl:
        prompt_tpl = prompts.get("DASHBOARD_INTERNAL", {}).get("briefing", "")

    context_str = json.dumps(context_data, ensure_ascii=False, indent=2)
    prompt = prompt_tpl.replace("{{context_data}}", context_str)

    try:
        response = client.models.generate_content(model=model_id, contents=prompt)
        text = response.text.strip()

        # Markdown 코드 블록 제거 처리
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()

        return json.loads(text)
    except Exception as e:
        error_msg = (
            "Analysis error." if lang == "en" else "분석 중 오류가 발생했습니다."
        )
        return {
            "briefing": f"{error_msg} (Error: {str(e)})",
            "sentiment": "neutral",
            "visual_type": "none",
        }


def get_widget_briefing(api_key, widget_type, widget_data):
    """
    특정 위젯의 데이터만 집중적으로 분석하여 요약 보고 생성 (다국어 지원)
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"
    lang = _get_lang()

    prompts = load_json_config(PROMPTS_CONFIG_PATH)
    prompt_tpl = (
        prompts.get(lang, {}).get("DASHBOARD_INTERNAL", {}).get("widget_briefing", "")
    )

    if not prompt_tpl:
        prompt_tpl = prompts.get("DASHBOARD_INTERNAL", {}).get("widget_briefing", "")

    data_str = json.dumps(widget_data, ensure_ascii=False, indent=2)
    prompt = prompt_tpl.replace("{{widget_type}}", widget_type).replace(
        "{{widget_data}}", data_str
    )

    try:
        response = client.models.generate_content(model=model_id, contents=prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()

        return json.loads(text)
    except Exception as e:
        print(f"[Gemini] Widget Briefing Error: {e}")
        error_msg = (
            f"Error analyzing {widget_type}."
            if lang == "en"
            else f"{widget_type} 분석 중 오류 발생."
        )
        return {
            "briefing": error_msg,
            "sentiment": "neutral",
        }


def process_command(api_key, command, context_data):
    """
    유저의 명령어를 분석하여 답변 및 실행 가능한 액션 반환 (다국어 지원)
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"
    lang = _get_lang()

    # 외부 프롬프트 로드 (언어 계층 반영)
    prompts = load_json_config(PROMPTS_CONFIG_PATH)
    prompt_tpl = (
        prompts.get(lang, {}).get("NLP_COMMAND_ENGINE", {}).get("command_parsing", "")
    )

    if not prompt_tpl:
        prompt_tpl = prompts.get("NLP_COMMAND_ENGINE", {}).get("command_parsing", "")

    context_str = json.dumps(context_data, ensure_ascii=False, indent=2)
    prompt = prompt_tpl.replace("{{context_data}}", context_str).replace(
        "{{command}}", command
    )

    try:
        response = client.models.generate_content(model=model_id, contents=prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
        return json.loads(text)
    except Exception as e:
        error_msg = (
            "Error processing command."
            if lang == "en"
            else "명령 처리 중 오류가 발생했습니다."
        )
        return {
            "response": f"{error_msg}: {str(e)}",
            "action": "none",
            "target": "",
            "sentiment": "neutral",
        }


def get_custom_response(api_key, prompt):
    """
    임의의 프롬프트를 전달하여 Gemini로부터 JSON 응답을 받음
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"

    try:
        response = client.models.generate_content(model=model_id, contents=prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
        return json.loads(text)
    except Exception as e:
        print(f"[Gemini] Custom Response Error: {e}")
        lang = _get_lang()
        error_msg = (
            "Error during analysis."
            if lang == "en"
            else "상황 분석 중 오류가 발생했습니다."
        )
        return {"text": error_msg, "sentiment": "neutral"}


def query_gemini(prompt):
    """
    notion_routes.py 등에서 공통으로 사용하는 Gemini 질의 함수.
    시스템 API 키를 자동으로 로드하여 사용합니다.
    """
    from routes.config import GEMINI_API_KEY

    res = get_custom_response(GEMINI_API_KEY, prompt)

    # notion_routes.py는 'response' 필드에서 텍스트를 찾으므로 매핑
    if "text" in res and "response" not in res:
        res["response"] = res["text"]

    return res
