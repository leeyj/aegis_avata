from google import genai
import json
import os
from utils import load_json_config
from routes.config import PROMPTS_CONFIG_PATH


def get_briefing(api_key, context_data):
    """
    Gemini를 사용하여 현재 대시보드 데이터를 기반으로 전술 브리핑 생성
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"

    # 외부 프롬프트 로드 (계층 구조 반영)
    prompts = load_json_config(PROMPTS_CONFIG_PATH)
    prompt_tpl = prompts.get("DASHBOARD_INTERNAL", {}).get("briefing", "")

    context_str = json.dumps(context_data, ensure_ascii=False, indent=2)
    prompt = prompt_tpl.replace("{context_data}", context_str)

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
        return {
            "briefing": f"브리핑 분석 중 기술적 오류가 발생했습니다. (사유: {str(e)})",
            "sentiment": "neutral",
            "visual_type": "none",
        }


def get_widget_briefing(api_key, widget_type, widget_data):
    """
    특정 위젯의 데이터만 집중적으로 분석하여 요약 보고 생성
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"

    prompts = load_json_config(PROMPTS_CONFIG_PATH)
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
        return {
            "briefing": f"{widget_type} 분석 중 오류가 발생했습니다.",
            "sentiment": "neutral",
        }


def process_command(api_key, command, context_data):
    """
    유저의 명령어를 분석하여 답변 및 실행 가능한 액션 반환
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"

    # 외부 프롬프트 로드
    prompts = load_json_config(PROMPTS_CONFIG_PATH)
    # NLP_COMMAND_ENGINE 섹션에서 로드
    prompt_tpl = prompts.get("NLP_COMMAND_ENGINE", {}).get("command_parsing", "")

    context_str = json.dumps(context_data, ensure_ascii=False, indent=2)
    prompt = prompt_tpl.replace("{context_data}", context_str).replace(
        "{command}", command
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
        return {
            "response": f"명령 처리 중 오류가 발생했습니다: {str(e)}",
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
        return {"text": "상황 분석 중 오류가 발생했습니다.", "sentiment": "neutral"}
