import sys
import os

# 프로젝트 루트를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.plugin_registry import (
    register_plugin_action,
    get_unified_help_markdown,
    register_context_provider,
)


def test_unified_help_generation():
    # 1. 테스트용 더미 플러그인 및 액션 등록
    register_context_provider(
        "test_widget", lambda: {"data": "test"}, aliases=["테스트"]
    )

    register_plugin_action(
        plugin_id="test_widget",
        action_id="do_something",
        handler=lambda x: True,
        desc="테스트용 액션입니다.",
        args=["param1"],
    )

    register_plugin_action(
        plugin_id="alarm",
        action_id="set",
        handler=lambda t, s: True,
        desc="알람을 설정합니다.",
        args=["time", "title"],
    )

    # 2. 도움말 생성
    help_text = get_unified_help_markdown()

    print("--- Unified Help Output ---")
    print(help_text)
    print("---------------------------")

    # 3. 검증
    assert "Widget Action Reference" in help_text
    assert "테스트" in help_text  # 별명 확인
    assert "do_something" in help_text
    assert "param1" in help_text
    assert "알람" in help_text
    assert "set" in help_text

    print("✅ Unified help generation verified successfully!")


if __name__ == "__main__":
    test_unified_help_generation()
