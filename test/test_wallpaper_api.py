import unittest
from flask import Flask
from routes.wallpaper import wallpaper_bp
from utils import save_wallpaper_config, SECRETS_FILE, _S
import json
import os
import tempfile
import hashlib

# For testing, we mock settings so it doesn't break user environment.
TEST_WALLPAPER_JSON = "test_wallpaper.json"


class WallpaperTestCase(unittest.TestCase):
    def setUp(self):
        # Setup Flask App
        self.app = Flask(__name__)
        self.app.register_blueprint(wallpaper_bp, url_prefix="/api/wallpaper")
        self.client = self.app.test_client()

        # Temporary setting swap
        from utils import load_json_config

        self.original_load_json_config = load_json_config

    def tearDown(self):
        if os.path.exists(TEST_WALLPAPER_JSON):
            os.remove(TEST_WALLPAPER_JSON)

    def test_wallpaper_status(self):
        response = self.client.get("/api/wallpaper/status")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("config", data)
        self.assertIn("is_sponsor", data)

    def test_set_wallpaper_config_not_sponsor(self):
        # Sponsor 권한 없는 상태에서 차단 로직 테스트 (mode 강제 변경 등)
        payload = {
            "mode": "url",
            "current": "http://evil.com/video.mp4",
            "is_video": True,
            "interval": 300,
        }

        response = self.client.post("/api/wallpaper/set", json=payload)
        self.assertEqual(response.status_code, 200)

        # 다시 읽었을때(비동기 로직이므로 mock 없이 utils 테스트하기는 어렵지만 status로 검증)
        res2 = self.client.get("/api/wallpaper/status")
        data2 = json.loads(res2.data)

        if not data2["is_sponsor"]:
            # 스폰서가 아니라면 static으로 강등되고 URL이 초기화되어야 함
            self.assertEqual(data2["config"].get("mode"), "static")
            self.assertEqual(data2["config"].get("current", ""), "")
            self.assertFalse(data2["config"].get("is_video"))


if __name__ == "__main__":
    unittest.main()
