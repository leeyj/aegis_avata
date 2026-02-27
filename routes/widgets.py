from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from routes.config import (
    GOOGLE_CONFIG_PATH,
    TTS_CONFIG_PATH,
    BREF_CONFIG_PATH,
    CLOCK_CONFIG_PATH,
    WEATHER_CONFIG_PATH,
    FINANCE_CONFIG_PATH,
    TICKER_CONFIG_PATH,
    SYSTEM_CONFIG_PATH,
    NEWS_CONFIG_PATH,
    PROACTIVE_CONFIG_PATH,
    BGM_CONFIG_PATH,
    REACTIONS_CONFIG_PATH,
)
from services import (
    google_calendar,
    news_service,
    weather_service,
    finance_service,
    stock_service,
    system_service,
)
from utils import load_json_config, load_settings, save_settings, is_sponsor
import os

widgets_bp = Blueprint("widgets", __name__)

# 설정 경로 매핑
CONFIG_PATH_MAP = {
    "tts": TTS_CONFIG_PATH,
    "google": GOOGLE_CONFIG_PATH,
    "bref": BREF_CONFIG_PATH,
    "clock": CLOCK_CONFIG_PATH,
    "weather": WEATHER_CONFIG_PATH,
    "finance": FINANCE_CONFIG_PATH,
    "ticker": TICKER_CONFIG_PATH,
    "system": SYSTEM_CONFIG_PATH,
    "news": NEWS_CONFIG_PATH,
    "proactive": PROACTIVE_CONFIG_PATH,
    "bgm": BGM_CONFIG_PATH,
    "reactions": REACTIONS_CONFIG_PATH,
}


@widgets_bp.route("/config/<name>")
@login_required
def get_config(name):
    """통합 설정 로드 라우트"""
    path = CONFIG_PATH_MAP.get(name)
    if path:
        return jsonify(load_json_config(path))
    return jsonify({"status": "error", "message": "Config not found"}), 404


# 하위 호환성을 위한 기존 라우트 (추후 프론트엔드 수정 시 제거 가능)
@widgets_bp.route("/tts_config")
@login_required
def tts_config():
    return get_config("tts")


@widgets_bp.route("/google_config")
@login_required
def google_config():
    return get_config("google")


@widgets_bp.route("/bref_config")
@login_required
def bref_config():
    return get_config("bref")


@widgets_bp.route("/clock_config")
@login_required
def clock_config():
    return get_config("clock")


@widgets_bp.route("/weather_config")
@login_required
def weather_config():
    return get_config("weather")


@widgets_bp.route("/finance_config")
@login_required
def finance_config():
    return get_config("finance")


@widgets_bp.route("/ticker_config")
@login_required
def ticker_config():
    return get_config("ticker")


@widgets_bp.route("/system_status")
@widgets_bp.route("/system_config")
@login_required
def system_config_alias():
    """시스템 설정 상태 반환 (기존 호환성)"""
    return get_config("system")


@widgets_bp.route("/calendar_events")
@login_required
def calendar_events():
    return jsonify(google_calendar.get_today_events())


@widgets_bp.route("/todo_list")
@login_required
def todo_list():
    return jsonify(google_calendar.get_today_tasks())


@widgets_bp.route("/add_todo", methods=["POST"])
@login_required
def add_todo():
    title = request.json.get("title")
    if not title:
        return jsonify({"status": "ERROR", "message": "No title provided"}), 400
    return jsonify(google_calendar.add_task(title))


@widgets_bp.route("/complete_todo", methods=["POST"])
@login_required
def complete_todo():
    tasklist_id = request.json.get("tasklist_id")
    task_id = request.json.get("task_id")
    if not tasklist_id or not task_id:
        return jsonify({"status": "ERROR", "message": "Missing info"}), 400
    return jsonify(google_calendar.complete_task(tasklist_id, task_id))


@widgets_bp.route("/recent_emails")
@login_required
def recent_emails():
    return jsonify(google_calendar.get_recent_emails())


@widgets_bp.route("/latest_news")
@login_required
def latest_news():
    config = load_json_config(NEWS_CONFIG_PATH)
    rss_urls = config.get("rss_urls", {})
    max_items = config.get("max_items", 5)
    return jsonify(news_service.get_news_rss(rss_urls, max_items))


@widgets_bp.route("/weather")
@widgets_bp.route("/weather_data")
@login_required
def weather():
    config = load_json_config(WEATHER_CONFIG_PATH)
    if config:
        api_key = config.get("api_key")
        city = config.get("city", "Seoul")
        return jsonify(weather_service.get_real_weather(api_key, city))
    return jsonify({"status": "ERROR", "message": "Config not found"}), 404


@widgets_bp.route("/market_indices")
@login_required
def market_indices():
    config = load_json_config(FINANCE_CONFIG_PATH)
    tickers = config.get("tickers", {})
    return jsonify(finance_service.get_market_indices(tickers))


@widgets_bp.route("/stock_data")
@login_required
def stock_data():
    config = load_json_config(TICKER_CONFIG_PATH)
    tickers = config.get("tickers", {})
    return jsonify(stock_service.get_stock_data(tickers))


@widgets_bp.route("/system_stats")
@login_required
def system_stats():
    try:
        config = load_json_config(SYSTEM_CONFIG_PATH)
        stats = system_service.get_system_stats(config)
        if stats:
            return jsonify(stats)
        else:
            return jsonify(
                {"status": "error", "message": "Failed to collect stats"}
            ), 500
    except Exception as e:
        print(f"[Error] /system_stats: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


@widgets_bp.route("/news_config")
@login_required
def news_config():
    return get_config("news")


@widgets_bp.route("/get_settings")
@login_required
def get_settings():
    return jsonify(load_settings())


@widgets_bp.route("/save_settings", methods=["POST"])
@login_required
def save_settings_route():
    data = request.json
    if save_settings(data):
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 500
