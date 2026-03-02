import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AEGIS_ROOT = BASE_DIR
MODELS_DIR = os.path.join(BASE_DIR, "models")
TEST_MODELS_DIR = os.path.join(BASE_DIR, "test_models")
I18N_DIR = os.path.join(BASE_DIR, "config", "i18n")
PLUGINS_DIR = os.path.join(BASE_DIR, "plugins")

# Core Shared Config Paths (BASE_DIR/config)
TTS_CONFIG_PATH = os.path.join(BASE_DIR, "config", "tts.json")
BREF_CONFIG_PATH = os.path.join(BASE_DIR, "config", "bref.json")
BGM_CONFIG_PATH = os.path.join(BASE_DIR, "config", "bgm.json")
API_CONFIG_PATH = os.path.join(BASE_DIR, "config", "api.json")
SECRETS_CONFIG_PATH = os.path.join(BASE_DIR, "config", "secrets.json")

# Google API Paths
CREDENTIALS_PATH = os.path.join(BASE_DIR, "config", "credentials.json")

# YTMusic Paths
DEFAULT_AUTH_PATH = os.path.join(BASE_DIR, "headers_auth.txt")


# Briefing Cache Paths
BRIEFING_TEXT_PATH = os.path.join(BASE_DIR, "static", "audio", "last_briefing.txt")
BRIEFING_AUDIO_PATH = os.path.join(BASE_DIR, "static", "audio", "last_briefing.mp3")


# Credentials & API (Load from secrets.json)
def _load_secrets():
    if os.path.exists(SECRETS_CONFIG_PATH):
        with open(SECRETS_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


_secrets = _load_secrets()
USER_CREDENTIALS = _secrets.get("USER_CREDENTIALS", {"admin": "admin123"})
GEMINI_API_KEY = _secrets.get("GEMINI_API_KEY", "")
EXTERNAL_API_KEYS = _secrets.get("EXTERNAL_API_KEYS", {})
FLASK_SECRET_KEY = _secrets.get("FLASK_SECRET_KEY", "default_secret_key")
DEBUG_MODE = False
