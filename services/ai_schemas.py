from typing import Dict, Any

# 대시보드 및 일반 브리핑용 스키마
BRIEFING_SCHEMA = {
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
}

# 터미널 명령어 처리용 스키마
COMMAND_SCHEMA = {
    "type": "object",
    "properties": {
        "response": {"type": "string", "description": "사용자에게 보여줄 응답 메시지"},
        "briefing": {"type": "string", "description": "음성 변환용 요약 텍스트"},
        "action": {
            "type": "string",
            "enum": ["navigate", "toggle", "search", "none"],
            "description": "수행할 시스템 액션",
        },
        "target": {"type": "string", "description": "액션의 대상 (URL, 위젯 ID 등)"},
        "sentiment": {
            "type": "string",
            "enum": ["happy", "neutral", "serious", "alert"],
        },
    },
    "required": ["response", "action", "sentiment"],
}
