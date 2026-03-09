import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .finance_service import get_market_indices
from utils import load_json_config, get_plugin_i18n
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

finance_plugin_bp = Blueprint("finance_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_finance_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    config = load_json_config(CONFIG_PATH)
    tickers = config.get("tickers", {})
    return get_market_indices(tickers)


# Aliases는 최대한 다양하게 지원 (한/영 통합)
aliases = get_plugin_i18n("finance", "aliases", lang="ko") + get_plugin_i18n(
    "finance", "aliases", lang="en"
)
register_context_provider("finance", get_finance_context, aliases=list(set(aliases)))


@finance_plugin_bp.route("/api/plugins/finance/indices")
@login_required
def get_indices_route():
    config = load_json_config(CONFIG_PATH)
    tickers = config.get("tickers", {})
    return jsonify(get_market_indices(tickers))


@finance_plugin_bp.route("/api/plugins/finance/config")
@login_required
def get_finance_config():
    return jsonify(load_json_config(CONFIG_PATH))
