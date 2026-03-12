import os
from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from .climate_service import ClimateService
from utils import load_json_config, save_json_config, get_plugin_i18n
from services.plugin_registry import register_context_provider

PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

climate_plugin_bp = Blueprint("climate_control_plugin", __name__)

# Climate Service 싱글톤 인스턴스
climate_service = ClimateService(CONFIG_PATH)


# Context Provider 등록 (브리핑 엔진 연동용)
def get_climate_context():
    status = climate_service.get_status()
    if "temp" in status:
        state_str = (
            get_plugin_i18n("climate-control", "context.on")
            if status["is_ac_on"]
            else get_plugin_i18n("climate-control", "context.off")
        )
        msg = get_plugin_i18n("climate-control", "context.status")
        return msg.format(temp=status["temp"], state=state_str)
    return get_plugin_i18n("climate-control", "context.error")


# Aliases는 최대한 다양하게 지원 (한/영 통합)
aliases = get_plugin_i18n("climate-control", "aliases", lang="ko") + get_plugin_i18n(
    "climate-control", "aliases", lang="en"
)
register_context_provider(
    "climate-control", get_climate_context, aliases=list(set(aliases))
)


# 1. 현황 조회
@climate_plugin_bp.route("/api/plugins/climate-control/status")
@login_required
def get_climate_status():
    status = climate_service.get_status()
    return jsonify(status)


# 2. 에어컨 제어
@climate_plugin_bp.route("/api/plugins/climate-control/control", methods=["POST"])
@login_required
def control_ac():
    data = request.json
    power = data.get("power", True)
    temp = data.get("temp")
    mode = data.get("mode")
    wind = data.get("wind")

    result = climate_service.set_ac(power=power, temp=temp, mode=mode, wind=wind)
    return jsonify(result)


# 3. 설정 조회/변경
@climate_plugin_bp.route("/api/plugins/climate-control/config", methods=["GET", "POST"])
@login_required
def manage_config():
    if request.method == "POST":
        new_config = request.json
        result = climate_service.update_config(new_config)
        return jsonify(result)
    else:
        config = load_json_config(CONFIG_PATH)
        return jsonify(config)
