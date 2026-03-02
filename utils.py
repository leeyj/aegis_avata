import os
import json
import hashlib
import tempfile

# 설정 파일 경로 정의
CONFIG_DIR = "config"
SECRETS_FILE = os.path.join(CONFIG_DIR, "secrets.json")
SETTINGS_FILE = "settings.json"
_S = "AEGIS_CORE_V48_SECRET_SALT_2026"


def load_json_config(path):
    """지정된 경로의 JSON 파일을 안전하게 읽기"""
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8-sig") as f:
                content = f.read().strip()
                return json.loads(content) if content else {}
        except Exception as e:
            print(f"[Utils] Load Error ({path}): {e}")
    return {}


def load_all_reactions(lang="ko"):
    """모든 플러그인 폴더의 reactions.json을 통합하여 특정 언어셋만 반환합니다."""
    from routes.config import PLUGINS_DIR

    combined = {}
    if not os.path.exists(PLUGINS_DIR):
        return combined

    for plugin_id in os.listdir(PLUGINS_DIR):
        p_path = os.path.join(PLUGINS_DIR, plugin_id, "reactions.json")
        if os.path.exists(p_path):
            try:
                p_data = load_json_config(p_path)
                # 언어별 키 탐색 (ko/en) -> 없으면 전체 데이터 사용(하위호환)
                lang_reactions = p_data.get(lang, p_data)
                if isinstance(lang_reactions, dict):
                    combined.update(lang_reactions)
            except Exception as e:
                print(f"[Utils] Error merging reactions from {plugin_id}: {e}")
    return combined


def save_json_config(path, data, merge=True):
    """지정된 경로에 JSON 데이터를 안전하게/원자적으로 저장"""
    try:
        # 1. 병합 모드인 경우 기존 데이터와 합침
        if merge and os.path.exists(path):
            current = load_json_config(path)
            current.update(data)
            data = current

        # 2. 임시 파일에 쓰기 (원자적 쓰기)
        base_dir = os.path.dirname(os.path.abspath(path))
        if not os.path.exists(base_dir):
            os.makedirs(base_dir)

        with tempfile.NamedTemporaryFile(
            "w", dir=base_dir, delete=False, encoding="utf-8", suffix=".tmp"
        ) as tf:
            json.dump(data, tf, indent=4)
            temp_path = tf.name

        # 3. 파일 교체
        os.replace(temp_path, path)
        return True
    except Exception as e:
        print(f"[Utils] Save Error ({path}): {e}")
        return False


def is_sponsor():
    """Sponsor 여부 확인"""
    data = load_json_config(SECRETS_FILE)
    key = data.get("SPONSOR_KEY", "")
    seed = data.get("SEED_KEY_VALUE", "")
    if not key.startswith("AEGIS-") or not seed:
        return False
    try:
        parts = key.split("-")
        if len(parts) != 4:
            return False
        _, i, px, s = parts
        raw = f"{px}{seed}{_S}"
        v = hashlib.sha256(raw.encode()).hexdigest().upper()[:8]
        return v == s
    except Exception:
        return False


def load_settings():
    return load_json_config(SETTINGS_FILE)


def save_settings(data):
    return save_json_config(SETTINGS_FILE, data)


def get_model_list(models_dir):
    try:
        return [
            d
            for d in os.listdir(models_dir)
            if os.path.isdir(os.path.join(models_dir, d))
            and d != "OLD"
            and not d.endswith("_backup")
        ]
    except Exception:
        return []


def get_model_info(models_dir, model_name):
    model_path = os.path.join(models_dir, model_name)
    info = {"motions": [], "expressions": []}
    if not os.path.exists(model_path):
        return info

    for sub in ["animations", "motions"]:
        p = os.path.join(model_path, sub)
        if os.path.exists(p):
            info["motions"].extend(
                [
                    f"{sub}/{f}"
                    for f in os.listdir(p)
                    if f.endswith((".motion3.json", ".mtn"))
                ]
            )

    exp_path = os.path.join(model_path, "expressions")
    if os.path.exists(exp_path):
        info["expressions"] = [
            f"expressions/{f}"
            for f in os.listdir(exp_path)
            if f.endswith((".exp3.json", ".exp.json"))
        ]

    for f in os.listdir(model_path):
        if f.endswith(".model3.json") or f.lower() == "model3.json":
            info["model_settings_file"] = f
            break

    alias_path = os.path.join(model_path, "alias.json")
    info["aliases"] = (
        load_json_config(alias_path)
        if os.path.exists(alias_path)
        else {"motions": {}, "expressions": {}}
    )
    return info
