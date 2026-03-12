import os
from typing import Any, Optional
import json
import tempfile

# 설정 파일 경로 정의
CONFIG_DIR = "config"
SECRETS_FILE = os.path.join(CONFIG_DIR, "secrets.json")
SETTINGS_FILE = "settings.json"


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
    """Sponsor 여부 확인 (바이너리화 로직 호출)"""
    from core_security import is_sponsor_raw

    return is_sponsor_raw(SECRETS_FILE)


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


def sanitize_context_data(data):
    """id, tasklist_id 등 기술적 식별자 및 대용량 메타데이터 제거 (설정 기반)"""
    filter_config = load_json_config(os.path.join("config", "ai_filter.json"))
    skip_keys = filter_config.get("context_sanitization", {}).get(
        "skip_keys", ["id", "threadId"]
    )

    def _recursive(d):
        if isinstance(d, list):
            return [_recursive(i) for i in d]
        if isinstance(d, dict):
            return {k: _recursive(v) for k, v in d.items() if k not in skip_keys}
        return d

    return _recursive(data)


def clean_ai_text(text: str) -> str:
    """AI 응답에서 불필요한 라벨, 접두사, 접미사 및 마크다운 래퍼를 설정을 기반으로 제거"""
    if not isinstance(text, str):
        return text

    text = text.strip()

    # 1. 마크다운 코드 블록 제거
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 2:
            if lines[-1].strip() == "```":
                text = "\n".join(lines[1:-1]).strip()
            else:
                text = "\n".join(lines[1:]).strip()
        else:
            text = text.replace("```", "").strip()

    # 2. 설정 기반 필터링 로드
    import re

    filter_config = load_json_config(os.path.join("config", "ai_filter.json"))
    f_opt = filter_config.get("response_filtering", {})

    # [태그] 및 (태그) 제거 (Separator용인 DISPLAY/VOICE는 제외 - ai_service에서 처리)
    tags = f_opt.get("tags_to_strip", ["AI", "SYSTEM"])
    tag_pattern = r"[\[\(](" + "|".join(tags) + r")[\]\)]"
    text = re.sub(tag_pattern, "", text, flags=re.IGNORECASE)

    # 접두사 처리 (명시적 목록 + 범용 패턴)
    prefixes = f_opt.get("prefixes_to_strip", [])
    for p in prefixes:
        # 이스케이프 처리하여 안전하게 제거
        text = re.sub(
            r"^" + re.escape(p) + r"\s*", "", text, flags=re.IGNORECASE | re.MULTILINE
        )

    # 범용 라벨 패턴 (예: "Response: ...", "Answer: ...")
    generic_regex = f_opt.get("generic_label_regex")
    if generic_regex:
        text = re.sub(generic_regex, "", text, flags=re.IGNORECASE | re.MULTILINE)

    # 접미사 처리
    suffixes = f_opt.get("suffixes_to_strip", [])
    for s in suffixes:
        text = re.sub(
            re.escape(s) + r"\.?$", "", text, flags=re.IGNORECASE | re.MULTILINE
        )

    # 남은 불필요한 공백 및 기호 정리 (Bold, Italic 등)
    text = re.sub(r"[*_]{1,3}", "", text)
    text = text.strip()
    return text


def get_i18n(key: str, lang: Optional[str] = None) -> str:
    """
    지정된 키의 다국어 문자열을 반환합니다.
    예: get_i18n("bot.persona", lang="ko")
    """
    if not lang:
        settings = load_settings()
        lang = settings.get("lang", "ko")

    i18n_path = os.path.join("config", "i18n", f"{lang}.json")
    if not os.path.exists(i18n_path):
        i18n_path = os.path.join("config", "i18n", "ko.json")

    data = load_json_config(i18n_path)

    # Dot notation 지원 (예: bot.persona)
    parts = key.split(".")
    val = data
    for p in parts:
        if isinstance(val, dict):
            val = val.get(p)
        else:
            return key

    # [CRITICAL] Do NOT change to 'if val'. Empty lists/strings are valid i18n data.
    return val if val is not None else key


def get_plugin_i18n(plugin_id: str, key: str, lang: Optional[str] = None) -> Any:
    """
    플러그인별 i18n.json 파일에서 다국어 문자열을 추출합니다.
    플러그인 레벨에 키가 없으면 전역 i18n 설정을 탐색합니다.

    Args:
        plugin_id: 플러그인 디렉토리명
        key: 'actions.list_desc' 형태의 닷 노테이션 키
        lang: 'ko' 또는 'en'. 생략 시 시스템 설정에 따름.
    """
    if not lang:
        settings = load_settings()
        lang = settings.get("lang", "ko")

    # 1. 플러그인 레벨 탐색
    plugin_path = os.path.join("plugins", plugin_id, "i18n.json")
    if os.path.exists(plugin_path):
        try:
            p_data = load_json_config(plugin_path)
            # { "ko": { ... }, "en": { ... } } 구조 대응
            lang_pack = p_data.get(lang, p_data)

            parts = key.split(".")
            val = lang_pack
            for p in parts:
                if isinstance(val, dict):
                    val = val.get(p)
                else:
                    val = None
                    break
            # [CRITICAL] Do NOT change to 'if val'. Empty lists/strings are valid i18n data.
            if val is not None:
                return val
        except Exception:
            pass

    # 2. 전역 레벨 탐색 (Fallback)
    val = get_i18n(key, lang=lang)
    if val == key:
        # [CRITICAL] If still not found, return empty list for 'args' keys
        if key.endswith(".args"):
            return []
    return val
