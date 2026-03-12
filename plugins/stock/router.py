import os
from typing import Optional
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .stock_service import get_stock_data
from utils import load_json_config, get_plugin_i18n
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

stock_plugin_bp = Blueprint("stock_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_stock_context(symbol: Optional[str] = None):
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    config = load_json_config(CONFIG_PATH)
    if symbol:
        # 특정 심볼 요청 시 해당 심볼만 조회
        tickers = {symbol: "Target"}
    else:
        tickers = config.get("tickers", {})
    return get_stock_data(tickers)


def initialize_plugin():
    """주식 플러그인 초기화 및 액션 등록"""
    from services.plugin_registry import register_plugin_action

    # 1. PRICE 등록
    def stock_price_view_handler(result, platform="web", lang=None):
        if not result:
            return get_plugin_i18n("stock", "views.fail", lang=lang)

        lines = []
        bullet = "-" if platform == "discord" else "•"
        for symbol, data in result.items():
            if isinstance(data, dict):
                price = data.get("price", "??")
                change = data.get("change", "0")
                lines.append(f"{bullet} **{symbol}**: {price} ({change})")
            else:
                lines.append(f"{bullet} **{symbol}**: {data}")
        return "\n".join(lines)

    register_plugin_action(
        plugin_id="stock",
        action_id="price",
        handler=lambda symbol=None: get_stock_context(symbol),
        desc=get_plugin_i18n("stock", "actions.price.desc"),
        args=get_plugin_i18n("stock", "actions.price.args"),
        sync_cmd="STOCK_SYNC",
        view_handler=stock_price_view_handler,
    )


register_context_provider(
    "stock", get_stock_context, aliases=["주식", "증시", "종목", "주가", "stock"]
)

# 플러그인 로드 시 초기화 실행
initialize_plugin()


@stock_plugin_bp.route("/api/plugins/stock/data")
@login_required
def get_stock_data_route():
    config = load_json_config(CONFIG_PATH)
    tickers = config.get("tickers", {})
    return jsonify(get_stock_data(tickers))


@stock_plugin_bp.route("/api/plugins/stock/config")
@login_required
def get_stock_config():
    return jsonify(load_json_config(CONFIG_PATH))
