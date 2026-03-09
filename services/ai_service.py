import requests
import re
import json
import logging
from utils import load_json_config, clean_ai_text
from routes.config import API_CONFIG_PATH, SECRETS_CONFIG_PATH

# 로깅 설정
logger = logging.getLogger(__name__)


def query_ai(
    prompt,
    source_key=None,
    is_system=False,
    context_data=None,
    system_instruction=None,
    with_search=True,
):
    """
    AEGIS Unified AI Hub: Dispatches queries to appropriate LLM engines.
    If is_system=True, it applies the AEGIS persona and can include context_data.
    """
    config = load_json_config(API_CONFIG_PATH)
    secrets = load_json_config(SECRETS_CONFIG_PATH)

    # 1. Determine Source
    if not source_key:
        source_key = config.get("default_source", "ollama")

    source_config = config.get("sources", {}).get(source_key)
    if not source_config or not source_config.get("active"):
        source_key = "general"
        source_config = config.get("sources", {}).get(source_key)

    if not source_config:
        return {"status": "error", "message": f"AI Source '{source_key}' not found."}

    url = source_config.get("base_url")
    model = source_config.get("model")
    api_type = source_config.get("api_type", "ollama")

    # [v3.8.0] ai_service는 순수 LLM 어댑터 역할만 수행.
    # 페르소나 및 컨텍스트 주입은 IntelligenceHub에서 담당함.

    if api_type == "gemini" or source_key == "general":
        try:
            from services.gemini_service import query_gemini

            gemini_result = query_gemini(
                prompt, system_instruction=system_instruction, with_search=with_search
            )

            if "response" in gemini_result or "display" in gemini_result:
                # 이미 규격화된 응답인 경우 그대로 반환하거나 재파싱
                raw_text = (
                    gemini_result.get("response") or gemini_result.get("display") or ""
                )
                d_part, v_part = _parse_dual_response(raw_text)

                # [v2.8.3] 빈 응답 방지 로직 강화
                if not d_part and raw_text:
                    d_part = clean_ai_text(raw_text)

                return {
                    "status": "success",
                    "display": d_part or "No displayable response.",
                    "briefing": v_part or d_part or "No briefing available.",
                    "model": "gemini",
                    "sentiment": gemini_result.get("sentiment", "neutral"),
                    "raw": raw_text,
                }
            return gemini_result
        except ImportError:
            return {"status": "error", "message": "Gemini service not available."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # 4. Handle External Engines (Ollama, OpenAI)
    headers = {"Content-Type": "application/json"}
    payload = {}

    if api_type == "ollama":
        combined_prompt = f"System: {system_instruction}\n\nUser: {prompt}"
        payload = {"model": model, "prompt": combined_prompt, "stream": False}
    elif api_type == "openai":
        api_key = secrets.get("AI_PROVIDER_KEYS", {}).get(source_key, "")
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "stream": False,
        }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        if response.status_code != 200:
            return {
                "status": "error",
                "message": f"AI Engine Error: {response.status_code}",
            }

        result = response.json()
        full_text = ""
        if api_type == "ollama":
            full_text = result.get("response", "")
        elif api_type == "openai":
            full_text = result["choices"][0].get("message", {}).get("content", "")

        # Use unified parser for [DISPLAY]/[VOICE] support
        display_part, voice_part = _parse_dual_response(full_text)

        return {
            "status": "success",
            "display": display_part or "No displayable response.",
            "briefing": voice_part or display_part or "No briefing available.",
            "model": model,
            "raw": full_text,
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}


def _parse_dual_response(text):
    """
    텍스트에서 [DISPLAY]와 [VOICE] 영역을 추출합니다.
    [v2.8.5] 태그 인식률 향상 및 중첩 래퍼 처리 강화
    """
    if not text:
        return "", ""

    # 1. JSON 블록 탐색 (가장 구조적인 데이터)
    json_match = re.search(r"(\{.*\})", text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1).strip())
            display_part = (
                data.get("display") or data.get("response") or data.get("text")
            )
            voice_part = (
                data.get("briefing")
                or data.get("voice")
                or data.get("voice_part")
                or display_part
            )
            if display_part:
                return str(display_part), str(voice_part)
        except Exception:
            pass

    # 2. 태그 기반 추출 ([DISPLAY] / [VOICE])
    # 태그를 포함한 굵게(**)나 헤더(###) 등 노이즈가 섞인 경우를 위해 유연한 매칭
    # [v2.8.5] non-greedy matching (.*?) 가 [VOICE] 앞에서 멈추도록 설정
    display_match = re.search(
        r"\[DISPLAY\](.*?)(?=\[VOICE\]|$)", text, re.DOTALL | re.IGNORECASE
    )
    voice_match = re.search(r"\[VOICE\](.*)", text, re.DOTALL | re.IGNORECASE)

    display_part = ""
    voice_part = ""

    if display_match:
        display_part = clean_ai_text(display_match.group(1).strip())
    if voice_match:
        voice_part = clean_ai_text(voice_match.group(1).strip())

    # 3. 예외 처리: 태그가 누락된 경우
    if not display_part:
        if voice_match:
            # VOICE 태그 이전 부분을 DISPLAY로 간주
            display_part = clean_ai_text(text[: voice_match.start()].strip())
        else:
            # 완전 태그 없음 -> 전체를 DISPLAY로 사용
            display_part = clean_ai_text(text)

    if not voice_part:
        # VOICE가 없으면 DISPLAY에서 기호 제거하여 생성
        voice_part = re.sub(r"[#*`\-]", "", display_part)
        # 줄바꿈 및 다중 공백 정리 (TTS 최적화)
        voice_part = re.sub(r"\s+", " ", voice_part).strip()

    return display_part, voice_part
