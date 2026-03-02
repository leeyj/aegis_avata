import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .stock_service import get_stock_data
from utils import load_json_config
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

stock_plugin_bp = Blueprint("stock_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_stock_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    config = load_json_config(CONFIG_PATH)
    tickers = config.get("tickers", {})
    return get_stock_data(tickers)


register_context_provider("stock", get_stock_context)


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
