import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .weather_service import get_real_weather
from utils import load_json_config
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

weather_plugin_bp = Blueprint("weather_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_weather_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    config = load_json_config(CONFIG_PATH)
    city = config.get("city", "Seoul")
    api_key = config.get("api_key", "")
    return get_real_weather(api_key, city)


register_context_provider("weather", get_weather_context, aliases=["날씨", "기상"])


@weather_plugin_bp.route("/api/plugins/weather/data")
@login_required
def get_weather_data():
    config = load_json_config(CONFIG_PATH)
    city = config.get("city", "Seoul")
    api_key = config.get("api_key", "")
    return jsonify(get_real_weather(api_key, city))


@weather_plugin_bp.route("/api/plugins/weather/config")
@login_required
def get_weather_config():
    return jsonify(load_json_config(CONFIG_PATH))
