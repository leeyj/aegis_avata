import sys
import os
from unittest.mock import MagicMock

# 프로젝트 루트 패스 추가
sys.path.append(os.getcwd())


def test_decentralized_formatting():
    from services.bot_gateway import BotManager
    from services.plugin_registry.action_manager import register_plugin_action

    bm = BotManager()

    print("\n--- [Test] Plugin-X Decentralized Formatting ---")

    # 1. 포맷터가 있는 플러그인 액션 가상 등록
    def mock_handler():
        return [{"title": "Test Task", "due": "Today"}]

    def mock_view_handler(result, platform="web"):
        return f"Custom Format: {result[0]['title']} is due {result[0]['due']}"

    register_plugin_action(
        plugin_id="mock_plugin",
        action_id="list",
        handler=mock_handler,
        desc="테스트용",
        view_handler=mock_view_handler,
    )

    # 2. 포맷터가 없는 플러그인 액션 가상 등록 (폴백 확인용)
    def simple_handler():
        return ["Raw Item 1", "Raw Item 2"]

    register_plugin_action(
        plugin_id="simple_plugin",
        action_id="list",
        handler=simple_handler,
        desc="폴백 테스트용",
    )

    # 3. 실행 및 포맷팅 검증 (Mocking handle_incoming_message logic)
    from services.plugin_registry.action_manager import get_action_view_handler

    # Case A: Custom Formatter
    action_key = "MOCK_PLUGIN_LIST"
    result_a = mock_handler()
    formatter_a = get_action_view_handler(action_key)
    print(f"[{action_key}] View Handler Found: {formatter_a is not None}")

    display_a = (
        formatter_a(result_a) if formatter_a else bm._format_action_result(result_a)
    )
    print(f"Result A: {display_a}")
    assert "Custom Format:" in display_a

    # Case B: Fallback Formatter
    action_key_b = "SIMPLE_PLUGIN_LIST"
    result_b = simple_handler()
    formatter_b = get_action_view_handler(action_key_b)
    print(f"\n[{action_key_b}] View Handler Found: {formatter_b is not None}")

    display_b = (
        formatter_b(result_b) if formatter_b else bm._format_action_result(result_b)
    )
    print(f"Result B:\n{display_b}")
    assert "• Raw Item 1" in display_b

    print("\n✅ Decentralized formatting test passed!")


if __name__ == "__main__":
    test_decentralized_formatting()
