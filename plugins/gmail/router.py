import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .gmail_service import get_recent_emails
from utils import load_json_config
from services.plugin_registry import register_context_provider
from services import require_permission

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

gmail_plugin_bp = Blueprint("gmail_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_emails_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API"""
    res = get_recent_emails()
    if isinstance(res, dict) and res.get("status") == "SUCCESS":
        return res.get("emails", [])
    return []


register_context_provider("emails", get_emails_context)


@gmail_plugin_bp.route("/api/plugins/gmail/recent")
@login_required
@require_permission("api.google_suite")
def get_recent_emails_route():
    return jsonify(get_recent_emails())


@gmail_plugin_bp.route("/api/plugins/gmail/config")
@login_required
def get_gmail_config():
    return jsonify(load_json_config(CONFIG_PATH))
