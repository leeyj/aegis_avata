import sys
import os
from unittest.mock import MagicMock

# Mocking modules
sys.modules["googleapiclient"] = MagicMock()
sys.modules["google_auth_oauthlib"] = MagicMock()
sys.modules["google"] = MagicMock()

# 프로젝트 루트를 path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.plugin_registry import get_unified_help_markdown, register_plugin_action


def test_i18n_help():
    # 더미 액션 등록
    register_plugin_action("alarm", "set", lambda: None, "알람 설정", ["time"])

    print("--- Korean Help ---")
    ko_help = get_unified_help_markdown(lang="ko")
    print(ko_help)
    assert "확정적 명령어" in ko_help

    print("\n--- English Help ---")
    en_help = get_unified_help_markdown(lang="en")
    print(en_help)
    assert "Deterministic Command" in en_help

    print("\n✅ Multilingual help verified successfully!")


if __name__ == "__main__":
    test_i18n_help()
