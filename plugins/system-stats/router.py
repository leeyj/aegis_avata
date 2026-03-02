import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .system_service import get_system_stats
from utils import load_json_config
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

system_stats_plugin_bp = Blueprint("system_stats_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_system_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    config = load_json_config(CONFIG_PATH)
    return get_system_stats(config)


register_context_provider("system-stats", get_system_context)


@system_stats_plugin_bp.route("/api/plugins/system-stats/data")
@login_required
def get_system_stats_data():
    config = load_json_config(CONFIG_PATH)
    return jsonify(get_system_stats(config))


@system_stats_plugin_bp.route("/api/plugins/system-stats/config")
@login_required
def get_system_config():
    return jsonify(load_json_config(CONFIG_PATH))
