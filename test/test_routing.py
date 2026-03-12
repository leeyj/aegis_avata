import os
import sys

# 프로젝트 루트를 패스에 추가
sys.path.append(os.getcwd())

from services.bot_gateway import bot_manager
from unittest.mock import MagicMock, patch


def test_routing():
    print("\n--- [Test] AEGIS Command Routing Verification ---")

    # Mocking
    bot_manager.is_user_allowed = MagicMock(return_value=True)

    with patch(
        "services.bot_intelligence.IntelligenceHub.fallback_to_ai"
    ) as mock_fallback:
        mock_fallback.return_value = {"text": "AI Response Mocked"}

        # 1. 확정적 명령(/) - 매칭 실패 케이스
        print("\n[Case 1] /일정 오후2시 회의 (Deterministic Match Fail)")
        with patch("services.plugin_registry.get_context_aliases") as mock_aliases:
            mock_aliases.return_value = {"일정": "calendar"}
            res1 = bot_manager.handle_incoming_message(
                platform="test", user_id="user1", text="/일정 오후2시 회의"
            )
            print(f"Result: {res1['text']}")
            assert "알 수 없는 명령어" in res1["text"]
            assert not mock_fallback.called

        # 2. 하이브리드 명령(@) - AI 폴백 케이스
        print("\n[Case 2] /@일정 오후2시 회의 (Hybrid AI Fallback)")
        with patch("services.plugin_registry.get_context_aliases") as mock_aliases:
            mock_aliases.return_value = {"일정": "calendar"}
            res2 = bot_manager.handle_incoming_message(
                platform="test", user_id="user1", text="/@일정 오후2시 회의"
            )
            print(f"Result: {res2['text']}")
            assert mock_fallback.called
            mock_fallback.reset_mock()

        # 3. 확정적 명령(/) - 시스템 도움말 케이스
        print("\n[Case 3] /help (System Command)")
        res3 = bot_manager.handle_incoming_message(
            platform="test", user_id="user1", text="/help"
        )
        print(f"Result: {res3['text']}")
        # 대소문자 구분 없이 확인
        assert "도움말" in res3["text"] or "help" in res3["text"].lower()

        # 4. 동적 프롬프트 기반 AI 액션 트리거 시뮬레이션
        print("\n[Case 4] AI Action Trigger via Dynamic Prompt")
        # IntelligenceHub.fallback_to_ai가 [ACTION] 태그를 포함한 응답을 한다고 가정
        with patch(
            "services.bot_intelligence.IntelligenceHub.fallback_to_ai"
        ) as mock_fallback_multi:
            mock_fallback_multi.return_value = {
                "text": "명령을 수행합니다.\n[ACTION] TODO_ADD: 집 청소하기"
            }
            res4 = bot_manager.handle_incoming_message(
                platform="test", user_id="user1", text="집 청소 일정을 추가해줘"
            )
            print(f"Result: {res4['text']}")
            # BotManager는 태그를 가공하여 답변만 반환해야 함 (또는 태그 포함 여부 확인)
            assert "명령을 수행합니다" in res4["text"]

    print("\n✅ All tests passed!")


if __name__ == "__main__":
    try:
        test_routing()
    except Exception as e:
        print(f"❌ Test Failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
