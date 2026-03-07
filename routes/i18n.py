from flask import Blueprint, jsonify, request
from routes.decorators import login_required
from routes.config import I18N_DIR
from utils import load_json_config, load_settings, save_settings
import os

i18n_bp = Blueprint("i18n", __name__)


@i18n_bp.route("/i18n_config")
@login_required
def i18n_config():
    """현재 설정된 언어의 JSON 팩 반환 및 플러그인 i18n 병합"""
    lang = request.args.get("lang")
    if not lang:
        settings = load_settings()
        lang = settings.get("lang", "ko")

    # 1. 전역 언어팩 로드
    pack_path = os.path.join(I18N_DIR, f"{lang}.json")
    combined_data = load_json_config(pack_path)

    # 2. [Plugin-X] 모든 플러그인의 i18n.json 병합
    from routes.config import PLUGINS_DIR

    if os.path.exists(PLUGINS_DIR):
        for plugin_id in os.listdir(PLUGINS_DIR):
            p_i18n_path = os.path.join(PLUGINS_DIR, plugin_id, "i18n.json")
            if os.path.exists(p_i18n_path):
                p_i18n_data = load_json_config(p_i18n_path)
                # 해당 언어 섹션이 있으면 병합
                lang_data = p_i18n_data.get(lang, {})
                if lang_data:

                    def deep_merge(target, source):
                        for k, v in source.items():
                            if (
                                k in target
                                and isinstance(target[k], dict)
                                and isinstance(v, dict)
                            ):
                                deep_merge(target[k], v)
                            else:
                                target[k] = v

                    deep_merge(combined_data, lang_data)

    return jsonify(combined_data)


@i18n_bp.route("/api/i18n/list")
@login_required
def list_languages():
    """사용 가능한 모든 언어팩 목록 및 메타데이터 반환"""
    langs = []
    if os.path.exists(I18N_DIR):
        for filename in os.listdir(I18N_DIR):
            if filename.endswith(".json") and not filename.startswith("_"):
                lang_code = filename.replace(".json", "")
                pack_path = os.path.join(I18N_DIR, filename)

                # 메타데이터 추출 시도
                label = lang_code.upper()
                try:
                    data = load_json_config(pack_path)
                    label = data.get("meta", {}).get("name", label)
                except Exception:
                    pass

                langs.append({"code": lang_code, "name": label})

    return jsonify(sorted(langs, key=lambda x: x["code"]))


@i18n_bp.route("/save_language", methods=["POST"])
@login_required
def save_language():
    """시스템 언어 설정을 업데이트합니다."""
    data = request.json
    new_lang = data.get("lang")
    # 파일 존재 여부로 검증 (ko.json, en.json, ja.json 등 확장성 확보)
    pack_path = os.path.join(I18N_DIR, f"{new_lang}.json")
    if not os.path.exists(pack_path):
        return jsonify({"status": "error", "message": "Language pack not found"}), 400

    config = load_settings()
    config["lang"] = new_lang
    if save_settings(config):
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 500
