import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Config Paths
CLOCK_CONFIG_PATH = os.path.join(BASE_DIR, "config", "clock.json")
WEATHER_CONFIG_PATH = os.path.join(BASE_DIR, "config", "weather.json")
SYSTEM_CONFIG_PATH = os.path.join(BASE_DIR, "config", "system.json")
FINANCE_CONFIG_PATH = os.path.join(BASE_DIR, "config", "finance.json")
NEWS_CONFIG_PATH = os.path.join(BASE_DIR, "config", "news.json")
GOOGLE_CONFIG_PATH = os.path.join(BASE_DIR, "config", "google.json")
TTS_CONFIG_PATH = os.path.join(BASE_DIR, "config", "tts.json")
BREF_CONFIG_PATH = os.path.join(BASE_DIR, "config", "bref.json")
TICKER_CONFIG_PATH = os.path.join(BASE_DIR, "config", "ticker.json")
PROACTIVE_CONFIG_PATH = os.path.join(BASE_DIR, "config", "proactive.json")
BGM_CONFIG_PATH = os.path.join(BASE_DIR, "config", "bgm.json")
REACTIONS_CONFIG_PATH = os.path.join(BASE_DIR, "config", "reactions.json")
PROMPTS_CONFIG_PATH = os.path.join(BASE_DIR, "config", "prompts.json")
SECRETS_CONFIG_PATH = os.path.join(BASE_DIR, "config", "secrets.json")

# Google API Paths
TOKEN_PERSONAL_PATH = os.path.join(BASE_DIR, "config", "token_personal.json")
TOKEN_WORK_PATH = os.path.join(BASE_DIR, "config", "token_work.json")
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
FLASK_SECRET_KEY = _secrets.get("FLASK_SECRET_KEY", "default_secret_key")
DEBUG_MODE = False
