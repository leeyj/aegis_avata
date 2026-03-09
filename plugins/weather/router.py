import os
from typing import Optional
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .weather_service import get_real_weather
from utils import load_json_config, get_plugin_i18n
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

weather_plugin_bp = Blueprint("weather_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_weather_context(city: Optional[str] = None):
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    config = load_json_config(CONFIG_PATH)
    target_city = city if city else config.get("city", "Seoul")
    api_key = config.get("api_key", "")
    return get_real_weather(api_key, target_city)


def initialize_plugin():
    """날씨 플러그인 초기화 및 액션 등록"""
    from services.plugin_registry import register_plugin_action

    # 1. GET 등록
    def weather_view_handler(result, platform="web", lang=None):
        if not result or "error" in result:
            return get_plugin_i18n("weather", "views.fail", lang=lang)

        city = result.get("city", "Unknown")
        temp = result.get("temp", "??")
        desc = result.get("description", "No info")
        humidity = result.get("humidity", "??")

        fmt = get_plugin_i18n("weather", "views.format", lang=lang)
        return fmt.format(city=city, desc=desc, temp=temp, humidity=humidity)

    register_plugin_action(
        plugin_id="weather",
        action_id="get",
        handler=lambda city=None: get_weather_context(city),
        desc=get_plugin_i18n("weather", "actions.get.desc"),
        args=get_plugin_i18n("weather", "actions.get.args"),
        sync_cmd="WEATHER_SYNC",
        view_handler=weather_view_handler,
    )


register_context_provider(
    "weather", get_weather_context, aliases=["날씨", "기상", "날시", "weather"]
)

# 플러그인 로드 시 초기화 실행
initialize_plugin()


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
