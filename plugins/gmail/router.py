import os
from flask import Blueprint, jsonify
from routes.decorators import login_required
from .gmail_service import get_recent_emails
from utils import load_json_config, get_plugin_i18n
from services.plugin_registry import register_context_provider
from services import require_permission

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

gmail_plugin_bp = Blueprint("gmail_plugin", __name__)


# 0. Plugin-X Context Provider 등록
def get_emails_context():
    """브리핑 및 대시보드에서 사용할 최신 데이터 추출 API (기본)"""
    res = get_recent_emails()
    if isinstance(res, dict) and res.get("status") == "SUCCESS":
        return res.get("emails", [])
    return []


def get_emails_ai_context():
    """AI를 위한 데이터 정제 버전 (ID 제거)"""
    emails = get_emails_context()
    return [
        {"subject": e["subject"], "from": e["from"], "snippet": e["snippet"]}
        for e in emails
    ]


def initialize_plugin():
    """Gmail 플러그인 초기화 및 액션 등록"""
    from services.plugin_registry import register_plugin_action

    def gmail_list_view_handler(result, platform="web", lang=None):
        if not result:
            return get_plugin_i18n("gmail", "views.empty", lang=lang)

        bullet = "-" if platform == "discord" else "•"
        lines = []
        for e in result:
            sender = e.get("from", get_plugin_i18n("gmail", "views.unknown", lang=lang))
            subject = e.get("subject", "No Subject")
            fmt = get_plugin_i18n("gmail", "views.format", lang=lang)
            lines.append(fmt.format(sender=sender, subject=subject))
        
        # Format mapping fix if needed (since I used {from} in i18n but keys vary)
        # Re-check i18n format: "• [{from}] {subject}"
        # Let's adjust view handler to match i18n keys or vice versa.
        # I'll use i18n key 'from' as 'sender' for mapping.
        lines = []
        for e in result:
             fmt = get_plugin_i18n("gmail", "views.format", lang=lang)
             # i18n usage: fmt.format(from=e['from'], subject=e['subject'])
             lines.append(fmt.format(**e))
             
        return "\n".join(lines)

    register_plugin_action(
        plugin_id="gmail",
        action_id="list",
        handler=get_emails_context,
        desc=get_plugin_i18n("gmail", "actions.list.desc"),
        args=get_plugin_i18n("gmail", "actions.list.args"),
        sync_cmd="GMAIL_SYNC",
        view_handler=gmail_list_view_handler
    )


# Aliases는 최대한 다양하게 지원 (한/영 통합)
try:
    aliases = get_plugin_i18n("gmail", "aliases", lang="ko") + get_plugin_i18n(
        "gmail", "aliases", lang="en"
    )
except:
    aliases = ["메일", "gmail"]

register_context_provider(
    "gmail",
    get_emails_context,
    ai_processor=get_emails_ai_context,
    aliases=list(set(aliases)),
)

# 초기화 실행
initialize_plugin()


@gmail_plugin_bp.route("/api/plugins/gmail/recent")
@login_required
@require_permission("api.google_suite")
def get_recent_emails_route():
    return jsonify(get_recent_emails())


@gmail_plugin_bp.route("/api/plugins/gmail/config")
@login_required
def get_gmail_config():
    return jsonify(load_json_config(CONFIG_PATH))
