import sys
import os

# Mocking modules that might cause overhead or errors during import
from unittest.mock import MagicMock

sys.modules["googleapiclient"] = MagicMock()
sys.modules["google_auth_oauthlib"] = MagicMock()
sys.modules["google"] = MagicMock()

# 프로젝트 루트를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import services.plugin_registry as pr


def test_minimal():
    # 1. 테스트용 더미 액션 등록
    # pr._action_help_data.clear() # Should be empty in a fresh import but good to be sure

    pr.register_plugin_action(
        plugin_id="alarm",
        action_id="set",
        handler=lambda: None,
        desc="알람 설정",
        args=["time", "title"],
    )

    pr.register_plugin_action(
        plugin_id="weather",
        action_id="get",
        handler=lambda: None,
        desc="날씨 조회",
        args=["location"],
    )

    # 2. 도움말 생성
    help_text = pr.get_unified_help_markdown()

    print("--- Unified Help Output ---")
    print(help_text)
    print("---------------------------")

    # 3. 검증
    assert "Widget Action Reference" in help_text
    assert "alarm" in help_text
    assert "set" in help_text
    assert "weather" in help_text
    assert "get" in help_text
    assert "<time> | <title>" in help_text or "time | title" in help_text

    print("✅ Minimal help generation verified successfully!")


if __name__ == "__main__":
    test_minimal()
