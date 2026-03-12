import unittest
import os
import sys
import json
from unittest.mock import patch, MagicMock

# 프로젝트 루트를 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import get_plugin_i18n, load_json_config


class TestPluginI18n(unittest.TestCase):
    """
    플러그인 i18n 통합 테스트 패키지 (v3.6.0)
    모든 플러그인의 i18n.json 존재 여부 및 get_plugin_i18n 동작을 검증합니다.
    """

    def setUp(self):
        self.plugins = [
            "todo",
            "alarm",
            "weather",
            "news",
            "notion",
            "youtube-music",
            "calendar",
            "terminal",
            "system-stats",
            "stock",
        ]
        self.base_dir = "c:\\Python312\\gods\\plugins"

    def test_i18n_files_exist(self):
        """모든 플러그인에 i18n.json 파일이 존재하는지 확인"""
        for plugin in self.plugins:
            i18n_path = os.path.join(self.base_dir, plugin, "i18n.json")
            self.assertTrue(os.path.exists(i18n_path), f"Missing i18n.json in {plugin}")

    def test_get_plugin_i18n_ko(self):
        """한국어(ko) 설정 시 각 플러그인별 고유 문자열 조회가 정상인지 확인"""

        def side_effect(path):
            if path == "settings.json":
                return {"lang": "ko"}
            return load_json_config(path)

        with patch("utils.load_json_config", side_effect=side_effect):
            # 1. Todo 예시 (i18n.json: "할 일 목록이 비어 있습니다.")
            msg = get_plugin_i18n("todo", "views.empty")
            self.assertIn("목록이 비어 있습니다", msg)

            # 2. Weather 예시
            msg = get_plugin_i18n("weather", "actions.get.desc")
            self.assertIn("날씨", msg)

    def test_get_plugin_i18n_en(self):
        """영어(en) 설정 시 각 플러그인별 고유 문자열 조회가 정상인지 확인"""

        def side_effect(path):
            if path == "settings.json":
                return {"lang": "en"}
            return load_json_config(path)

        with patch("utils.load_json_config", side_effect=side_effect):
            # 1. Todo 예시 (i18n.json: "Your todo list is currently empty.")
            msg = get_plugin_i18n("todo", "views.empty")
            self.assertIn("todo list is currently empty", msg)

            # 2. Weather 예시
            msg = get_plugin_i18n("weather", "actions.get.desc")
            self.assertIn("weather", msg.lower())

    def test_get_plugin_i18n_fallback(self):
        """존재하지 않는 키 요청 시 기본값(get_i18n) 또는 키 자체를 반환하는지 확인"""

        def side_effect(path):
            if path == "settings.json":
                return {"lang": "ko"}
            return load_json_config(path)

        with patch("utils.load_json_config", side_effect=side_effect):
            # 없는 키 요청
            msg = get_plugin_i18n("todo", "non_existent_key")
            self.assertEqual(msg, "non_existent_key")

    def test_view_handler_lang_propagation(self):
        """view_handler 호출 시 lang 파라미터가 명시적으로 전달될 때 동작 확인"""

        def side_effect(path):
            if path == "settings.json":
                return {"lang": "ko"}
            return load_json_config(path)

        with patch("utils.load_json_config", side_effect=side_effect):
            # 명시적으로 en을 요청하는 경우
            msg = get_plugin_i18n("terminal", "views.unknown_error", lang="en")
            self.assertEqual(msg, "Unknown Error")


if __name__ == "__main__":
    unittest.main()
