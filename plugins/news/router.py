import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .news_service import get_news_rss
from utils import load_json_config
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

news_plugin_bp = Blueprint("news_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_news_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    config = load_json_config(CONFIG_PATH)
    rss_urls = config.get("rss_urls", {})
    # [QOTA] 브리핑용 뉴스 수집은 5개로 제한
    return get_news_rss(rss_urls, max_items=5)


register_context_provider("news", get_news_context)


@news_plugin_bp.route("/api/plugins/news/latest")
@login_required
def get_latest_news():
    config = load_json_config(CONFIG_PATH)
    rss_urls = config.get("rss_urls", {})
    max_items = config.get("max_items", 5)
    return jsonify(get_news_rss(rss_urls, max_items))


@news_plugin_bp.route("/api/plugins/news/config")
@login_required
def get_news_config():
    return jsonify(load_json_config(CONFIG_PATH))
