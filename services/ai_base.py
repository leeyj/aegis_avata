import logging
import json
from routes.config import GEMINI_API_KEY
from utils import clean_ai_text

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types
except ImportError:
    logger.warning("google-genai package not found. AI features will be limited.")
    genai = None
    types = None


class GeminiClientWrapper:
    """
    AEGIS Gemini API Wrapper
    클라이언트 생성 및 공통 호출 로직을 관리합니다.
    """

    def __init__(self, api_key: str = None):
        self.api_key = api_key or GEMINI_API_KEY
        self.client = genai.Client(api_key=self.api_key) if genai else None
        self.model_id = "gemini-2.0-flash"

    def clean_response(self, text: str) -> str:
        """응답 텍스트에서 마크다운 래퍼 등을 제거합니다."""
        return clean_ai_text(text)

    def parse_json_response(self, text: str) -> dict:
        """JSON 형태의 응답을 파싱합니다."""
        cleaned = self.clean_response(text)
        try:
            # ```json ... ``` 블록 처리
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:-3].strip()
            return json.loads(cleaned)
        except Exception as e:
            logger.error(f"Failed to parse JSON response: {e}")
            return {}


ai_base = GeminiClientWrapper()
