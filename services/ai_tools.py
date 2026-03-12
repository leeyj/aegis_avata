import logging
from typing import Dict, Any
from utils import sanitize_context_data

logger = logging.getLogger(__name__)


# [v2.5.1] 도구 1: 내부 시스템 컨텍스트 조회
def get_internal_system_data(context_data: Dict[str, Any]) -> Dict[str, Any]:
    """내부 위젯의 현재 상태 및 시스템 컨텍스트를 조회합니다."""
    print("[ai_tools] >>> Tool Call: get_internal_system_data")
    clean_data = sanitize_context_data(context_data)
    print(f"[ai_tools] <<< Sanitized Data for: {list(clean_data.keys())}")
    return clean_data


# [v2.5.1] 도구 2: 외부 웹 검색 대행 (Google Search)
def search_the_web(client, query: str, model_id: str = "gemini-2.0-flash"):
    """실시간 정보 검색을 수행합니다."""
    print(f"[ai_tools] >>> Tool Call: search_the_web (Query: {query})")
    from google.genai import types

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
        logger.error(f"Search Tool Error: {e}")
        return f"Error: {str(e)}"
