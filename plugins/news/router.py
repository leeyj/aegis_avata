import os
from typing import Optional
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .news_service import get_news_rss
from utils import load_json_config, get_plugin_i18n
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

news_plugin_bp = Blueprint("news_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_news_context(category: Optional[str] = None):
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    config = load_json_config(CONFIG_PATH)
    rss_urls = config.get("rss_urls", {})

    # 카테고리가 지정되었으면 해당 카테고린만 필터링
    if category and category in rss_urls:
        target_urls = {category: rss_urls[category]}
    else:
        target_urls = rss_urls

    return get_news_rss(target_urls, max_items=5)


def initialize_plugin():
    """뉴스 플러그인 초기화 및 액션 등록"""
    from services.plugin_registry import register_plugin_action

    # 1. BRIEF 등록
    def news_brief_view_handler(result, platform="web", lang=None):
        if not result:
            return get_plugin_i18n("news", "views.fail", lang=lang)

        lines = []
        bullet = "-" if platform == "discord" else "•"
        fmt = get_plugin_i18n("news", "views.format", lang=lang)
        for item in result:
            title = item.get("title", "No Title")
            source = item.get("source", "Unknown")
            lines.append(fmt.format(bullet=bullet, title=title, source=source))
        return "\n".join(lines)

    register_plugin_action(
        plugin_id="news",
        action_id="brief",
        handler=lambda category=None: get_news_context(category),
        desc=get_plugin_i18n("news", "actions.brief.desc"),
        args=get_plugin_i18n("news", "actions.brief.args"),
        sync_cmd="NEWS_SYNC",
        view_handler=news_brief_view_handler,
    )


register_context_provider(
    "news", get_news_context, aliases=["뉴스", "기사", "소식", "news"]
)

# 플러그인 로드 시 초기화 실행
initialize_plugin()


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
