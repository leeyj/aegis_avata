from flask import Blueprint, jsonify
from routes.decorators import login_required

core_bridge_bp = Blueprint("core_bridge", __name__)


@core_bridge_bp.route("/api/plugins/core-bridge/status")
@login_required
def get_status():
    return jsonify({"status": "active", "service": "CommandRouter"})
