from google import genai
import json
import os
from utils import load_json_config, load_settings
from routes.config import PLUGINS_DIR, GEMINI_API_KEY


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


def get_briefing(api_key, context_data):
    """
    대시보드 전술 브리핑 생성 (proactive-agent 플러그인 프롬프트 사용)
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"

    # [Plugin-X] 프롬프트 이관 반영: proactive-agent 폴더에서 로드
    prompt_tpl = _load_plugin_prompt("proactive-agent", "dashboard_briefing")

    if not prompt_tpl:
        # Fallback 기본 프롬프트
        prompt_tpl = "You are AEGIS Intelligence. Summarize the following context data in JSON format: {{context_data}}"

    context_str = json.dumps(context_data, ensure_ascii=False, indent=2)
    prompt = prompt_tpl.replace("{{context_data}}", context_str)

    print(f"[Gemini] [ACTION] Constructing Briefing Prompt (Tpl: {prompt_tpl[:50]}...)")
    # print(f"[Gemini] [DEBUG] FULL PROMPT: \n{prompt}") # 주석 처리하여 노이즈 방지, 필요시 해제

    try:
        print(
            "[Gemini] [NETWORK] Requesting generation from model: gemini-2.0-flash..."
        )
        response = client.models.generate_content(model=model_id, contents=prompt)
        text = response.text.strip()
        print(f"[Gemini] [DEBUG] Raw response received ({len(text)} chars).")
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
        return json.loads(text)
    except Exception as e:
        print(f"[Gemini] Briefing Error: {e}")
        return {
            "briefing": "Analysis failed.",
            "sentiment": "neutral",
            "visual_type": "none",
        }


def get_plugin_briefing(api_key, plugin_id, task, data):
    """
    플러그인 전용 AI 서비스 (각 플러그인의 prompts.json 사용)
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"
    lang = _get_lang()

    prompt_tpl = _load_plugin_prompt(plugin_id, task)

    if not prompt_tpl:
        prompt_tpl = (
            f"You are AI analyst for plugin '{plugin_id}'.\n"
            f"Task: {task}\nData: {{data}}\nProvide a concise analysis in {lang}."
        )

    data_str = json.dumps(data, ensure_ascii=False, indent=2)
    prompt = prompt_tpl.replace("{{data}}", data_str)

    try:
        response = client.models.generate_content(model=model_id, contents=prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
        return json.loads(text)
    except Exception as e:
        print(f"[Gemini] Plugin Briefing Error: {e}")
        return {"briefing": f"Analysis failed for {plugin_id}.", "sentiment": "neutral"}


def get_widget_briefing(api_key, widget_type, widget_data):
    """
    특정 위젯 전용 요약 보고 (각 위젯 플러그인 프롬프트 사용)
    """
    # widget_type을 plugin_id로 간주하여 처리
    return get_plugin_briefing(api_key, widget_type, "widget_briefing", widget_data)


def process_command(api_key, command, context_data):
    """
    유저 명령어 분석 (terminal 플러그인 프롬프트 사용)
    """
    client = genai.Client(api_key=api_key)
    model_id = "gemini-2.0-flash"

    prompt_tpl = _load_plugin_prompt("terminal", "command_parsing")

    if not prompt_tpl:
        prompt_tpl = (
            "Analyze command: {{command}}\nContext: {{context_data}}\nRespond in JSON."
        )

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
        print(f"[Gemini] Command Error: {e}")
        return {"response": "Command error.", "action": "none", "sentiment": "neutral"}


def get_custom_response(api_key, prompt):
    """기존 ad-hoc 질의 유지 (proactive-agent의 AI 허브 설정 활용 가능성)"""
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
        print(f"[Gemini] Custom Error: {e}")
        return {"text": "Error during analysis.", "sentiment": "neutral"}


def query_gemini(prompt):
    res = get_custom_response(GEMINI_API_KEY, prompt)
    if "text" in res and "response" not in res:
        res["response"] = res["text"]
    return res
