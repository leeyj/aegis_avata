import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# 프로젝트 루트를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.bot_gateway import BotManager
from services.plugin_registry import register_plugin_action, get_all_actions


class TestRefinement(unittest.TestCase):
    def setUp(self):
        self.bot = BotManager()
        # Mocking dependencies
        self.bot.intelligence = MagicMock()

    @patch("services.plugin_registry.get_action_by_command")
    @patch("services.plugin_registry.get_context_aliases")
    @patch("plugins.alarm.alarm_core.alarm_service.set_alarm")
    def test_alarm_add_no_pipe_no_date(
        self, mock_set_alarm, mock_get_aliases, mock_get_action
    ):
        # Case: /알람 추가 02:00 청소
        # 1. Mocking get_context_aliases to return {'알람': 'alarm'}
        mock_get_aliases.return_value = {"알람": "alarm"}

        # 2. Mocking get_action_by_command to return ('alarm', 'set')
        mock_get_action.return_value = ("alarm", "set")

        # 3. Mocking alarm_service.set_alarm to return success
        mock_set_alarm.return_value = (True, "Success")

        # 4. Mocking register_plugin_action mapping
        from services.plugin_registry import register_plugin_action

        def dummy_handler(time, title, target_id=None):
            return mock_set_alarm(time, title, target_id=target_id)

        register_plugin_action(
            plugin_id="alarm",
            action_id="set",
            handler=dummy_handler,
            desc="Test",
            args=["time", "title"],
        )

        # 5. Execute handle_incoming_message
        self.bot.is_user_allowed = MagicMock(return_value=True)
        result = self.bot.handle_incoming_message(
            "test_platform", "test_user", "/알람 추가 02:00 청소"
        )

        # 6. Verify result
        print(f"Result: {result}")
        self.assertIn("successfully", result["text"])

        # 7. Verify mock_set_alarm was called with "02:00" and "청소"
        mock_set_alarm.assert_called_with("02:00", "청소", target_id=None)


if __name__ == "__main__":
    unittest.main()
