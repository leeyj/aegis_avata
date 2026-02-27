import requests
import re
from utils import load_json_config
from routes.config import API_CONFIG_PATH, SECRETS_CONFIG_PATH, PROMPTS_CONFIG_PATH


def query_ai(prompt, source_key="ollama"):
    """
    api.json 설정에 정의된 api_type에 따라 적절한 AI 엔진에 질의를 수행합니다.
    화면 표시용(display)과 음성 낭독용(voice)이 분리된 답변을 생성합니다.
    시스템 프롬프트는 prompts.json에서 로드합니다.
    """
    config = load_json_config(API_CONFIG_PATH)
    secrets = load_json_config(SECRETS_CONFIG_PATH)
    prompts = load_json_config(PROMPTS_CONFIG_PATH)

    source_config = config.get("sources", {}).get(source_key)

    if not source_config or not source_config.get("active"):
        return {
            "status": "error",
            "message": f"Source '{source_key}' is not active or not found.",
        }

    url = source_config.get("base_url")
    model = source_config.get("model")
    api_type = source_config.get("api_type", "ollama")

    # 1. 시뮬레이션 모드 처리
    if source_config.get("mock"):
        import time

        time.sleep(1)
        return {
            "status": "success",
            "answer": f"### [SIMULATION] {source_config.get('name')} 엔진\n\n질문하신 **{prompt}**에 대한 시뮬레이션 결과입니다.",
            "briefing": "시뮬레이션 모드 답변입니다. 실제 연동 시에는 음성으로 자연스럽게 들리게 됩니다.",
            "model": model,
        }

    # 2. prompts.json에서 시스템 지침 로드 (계층 구조 및 AI별 세분화 반영)
    hub_prompts = prompts.get("EXTERNAL_AI_HUB", {})
    # 소스별 전용 프롬프트 시도 -> 없으면 default 시도
    system_instruction = hub_prompts.get(source_key) or hub_prompts.get(
        "default",
        (
            "너는 인공지능 개인 비서 'AEGIS'이다. [DISPLAY]와 [VOICE] 태그를 사용하여 응답하라."
        ),
    )

    headers = {"Content-Type": "application/json"}
    payload = {}

    # 3. API 타입별 요청 구성
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
                "message": f"AI Engine Error ({response.status_code}): {response.text}",
            }

        result = response.json()

        # 4. 응답 파싱
        full_text = ""
        if api_type == "ollama":
            full_text = result.get("response", "")
        elif api_type == "openai":
            if "choices" in result and len(result["choices"]) > 0:
                full_text = result["choices"][0].get("message", {}).get("content", "")
            elif "error" in result:
                return {"status": "error", "message": f"AI Error: {result['error']}"}

        if not full_text:
            return {"status": "error", "message": "Empty response from AI engine."}

        # 5. [DISPLAY]와 [VOICE] 분리 (헬퍼 함수 활용)
        display_part, voice_part = _parse_dual_response(full_text)

        return {
            "status": "success",
            "answer": display_part,
            "briefing": voice_part,
            "model": model,
        }
    except Exception as e:
        return {"status": "error", "message": f"Service Error: {str(e)}"}


def _parse_dual_response(text):
    """
    텍스트에서 [DISPLAY]와 [VOICE] 영역을 추출합니다.
    """
    display_part = ""
    voice_part = ""

    if "[DISPLAY]" in text and "[VOICE]" in text:
        display_match = re.search(
            r"\[DISPLAY\](.*?)\[VOICE\]", text, re.DOTALL | re.IGNORECASE
        )
        voice_match = re.search(r"\[VOICE\](.*)", text, re.DOTALL | re.IGNORECASE)

        if display_match:
            display_part = display_match.group(1).strip()
        if voice_match:
            voice_part = voice_match.group(1).strip()

    # 분리 실패 시 예외 처리 및 정제
    if not display_part:
        display_part = text.replace("[DISPLAY]", "").replace("[VOICE]", "").strip()
    if not voice_part:
        # 기호 제거 로직 적용
        voice_part = re.sub(r"[#*`\-]", "", display_part)
        voice_part = re.sub(r"\[.*?\]", "", voice_part).strip()

    return display_part, voice_part
