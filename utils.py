import os
import json

SETTINGS_FILE = "settings.json"


def load_settings():
    """settings.json 파일 읽기"""
    return load_json_config(SETTINGS_FILE)


def load_json_config(path):
    """지정된 경로의 JSON 파일을 안전하게 읽기 (손상 복구 포함)"""
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return {}
                return json.loads(content)
        except json.JSONDecodeError as je:
            print(f"[Utils] JSON Corrupted ({path}), resetting: {je}")
            # 손상된 경우 빈 객체 반환 (다음 저장 시 복구됨)
            # 파일 내용을 비워서 다음 로드 시 문제가 없도록 함
            try:
                with open(path, "w", encoding="utf-8") as f:
                    f.write("{}")
            except Exception as e_reset:
                print(
                    f"[Utils] Failed to reset corrupted JSON file ({path}): {e_reset}"
                )
            return {}
        except Exception as e:
            print(f"[Utils] Load Error ({path}): {e}")
    return {}


def save_settings(data):
    """settings.json 파일 저장 (키 통합 + 원자적 교체 방식)"""
    import tempfile

    try:
        # 1. 기존 데이터 로드
        current = load_settings()

        # 2. 키 통합 처리 (snake_case -> camelCase)
        # 프론트엔드와 백엔드가 섞여서 생기는 중복 제거
        key_map = {
            "ui_positions": "uiPositions",
            "panel_visibility": "panelVisibility",
            "zoom": "userZoom",
            "offset_x": "offsetX",
            "offset_y": "offsetY",
            "test_mode": "test_mode",  # 유지
            "last_model": "last_model",  # 유지
        }

        # 새 데이터의 키 변환 및 병합
        for k, v in data.items():
            target_key = key_map.get(k, k)
            if target_key in ["uiPositions", "panelVisibility"] and isinstance(v, dict):
                # 딕셔너리 내부 업데이트
                if target_key not in current:
                    current[target_key] = {}
                current[target_key].update(v)
            else:
                current[target_key] = v

        # 구버전 키 삭제
        for old_k in [
            "ui_positions",
            "panel_visibility",
            "zoom",
            "offset_x",
            "offset_y",
            "Test_mode",
        ]:
            current.pop(old_k, None)

        # 3. 임시 파일에 쓰기
        base_dir = os.path.dirname(os.path.abspath(SETTINGS_FILE))
        with tempfile.NamedTemporaryFile(
            "w", dir=base_dir, delete=False, encoding="utf-8", suffix=".tmp"
        ) as tf:
            json.dump(current, tf, indent=4)
            tf.flush()
            os.fsync(tf.fileno())
            temp_path = tf.name

        # 4. 원자적 교체
        os.replace(temp_path, SETTINGS_FILE)
        return True

    except Exception as e:
        print(f"[Utils] Atomic Save Error: {e}")
        return False


def get_model_list(models_dir):
    """지정된 디렉토리 내의 라이브2D 모델 폴더 목록을 반환"""
    try:
        if not os.path.exists(models_dir):
            return []
        return sorted(
            [
                d
                for d in os.listdir(models_dir)
                if os.path.isdir(os.path.join(models_dir, d))
            ]
        )
    except Exception:
        return []


def get_model_info(models_dir, model_name):
    """특정 모델의 애니메이션 및 표정 파일 리스트를 반환"""
    model_path = os.path.join(models_dir, model_name)
    info = {"motions": [], "expressions": []}

    if not os.path.exists(model_path):
        return info

    # 애니메이션 탐색 (animations 또는 motions 폴더)
    for sub in ["animations", "motions"]:
        p = os.path.join(model_path, sub)
        if os.path.exists(p):
            info["motions"].extend(
                [f"{sub}/{f}" for f in os.listdir(p) if f.endswith(".motion3.json")]
            )

    # 표정 탐색
    exp_path = os.path.join(model_path, "expressions")
    if os.path.exists(exp_path):
        info["expressions"] = [
            f for f in os.listdir(exp_path) if f.endswith(".exp3.json")
        ]

    # 모델 설정 파일 탐색 (.model3.json)
    for f in os.listdir(model_path):
        if f.endswith(".model3.json"):
            info["model_settings_file"] = f
            break

    # Alias 설정 로드 (alias.json)
    alias_path = os.path.join(model_path, "alias.json")
    if os.path.exists(alias_path):
        info["aliases"] = load_json_config(alias_path)
    else:
        info["aliases"] = {"motions": {}, "expressions": {}}

    return info
