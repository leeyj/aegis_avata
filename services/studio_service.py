import os
import shutil
import json
from routes.config import MODELS_DIR, TEST_MODELS_DIR, AEGIS_ROOT
from utils import get_model_list, get_model_info, load_json_config, save_settings


class StudioService:
    @staticmethod
    def get_test_models():
        """테스트 폴더의 모델 목록을 반환합니다."""
        return get_model_list(TEST_MODELS_DIR)

    @staticmethod
    def get_test_model_info(name):
        """테스트 모델의 상세 정보를 반환합니다."""
        return get_model_info(TEST_MODELS_DIR, name)

    @staticmethod
    def save_alias(name, data):
        """모델의 alias.json 파일을 저장합니다."""
        model_path = os.path.join(TEST_MODELS_DIR, name)
        if not os.path.exists(model_path):
            raise FileNotFoundError("Model path not found")

        save_path = os.path.join(model_path, "alias.json")
        with open(save_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True

    @staticmethod
    def apply_model(name):
        """테스트 모델을 실운영 폴더로 배포하고 설정을 적용합니다."""
        src = os.path.join(TEST_MODELS_DIR, name)
        dst = os.path.join(MODELS_DIR, name)

        if not os.path.exists(src):
            raise FileNotFoundError("Source model not found")

        # 1. 기존 폴더 삭제 후 복사
        if os.path.exists(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst)

        # 2. 에이기스 설정 업데이트
        save_settings({"last_model": name})
        return True

    @staticmethod
    def fix_model(name):
        """테스트 모델의 문제를 자동으로 감지하고 수정하여 요약 리포트를 반환합니다."""
        import re
        import subprocess
        from datetime import datetime

        stats = {
            "backup_path": "",
            "folder_renamed": False,
            "json_standardized": False,
            "paths_fixed": 0,
            "alias_generated": False,
        }

        model_dir = os.path.join(TEST_MODELS_DIR, name)
        if not os.path.exists(model_dir):
            raise FileNotFoundError("Model directory not found")

        # 1. OLD 폴더 백업 시스템
        old_root = os.path.join(TEST_MODELS_DIR, "OLD")
        os.makedirs(old_root, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = os.path.join(old_root, f"{name}_{timestamp}")

        try:
            shutil.copytree(model_dir, backup_dir)
            stats["backup_path"] = backup_dir
        except Exception as e:
            print(f"[Studio] Backup error: {e}")

        # 2. 폴더명 규격화 (motion -> motions)
        motion_path = os.path.join(model_dir, "motion")
        motions_path = os.path.join(model_dir, "motions")
        if os.path.exists(motion_path) and not os.path.exists(motions_path):
            os.rename(motion_path, motions_path)
            stats["folder_renamed"] = True

        # 3. 설정 파일 찾기 및 문법 교정
        setting_file = None
        for f in os.listdir(model_dir):
            if f.endswith(".model3.json"):
                setting_file = f
                break
        if not setting_file:
            for f in os.listdir(model_dir):
                if f.endswith(".model.json") or f == "model.json":
                    setting_file = f
                    break

        if setting_file:
            file_path = os.path.join(model_dir, setting_file)
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                content = re.sub(r",\s*([\]}])", r"\1", content)
                data = json.loads(content)

                def fix_internal_paths(obj):
                    fixed_count = 0
                    if isinstance(obj, dict):
                        for k, v in obj.items():
                            if isinstance(v, str):
                                if "motion/" in v and "motions/" not in v:
                                    obj[k] = v.replace("motion/", "motions/")
                                    fixed_count += 1
                            else:
                                fixed_count += fix_internal_paths(v)
                    elif isinstance(obj, list):
                        for i in obj:
                            fixed_count += fix_internal_paths(i)
                    return fixed_count

                stats["paths_fixed"] = fix_internal_paths(data)

                target_path = os.path.join(model_dir, "model3.json")
                with open(target_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=4, ensure_ascii=False)

                if setting_file != "model3.json":
                    os.remove(file_path)
                    stats["json_standardized"] = True

            except Exception as e:
                print(f"Auto-fix JSON error: {e}")

        # 4. 에일리어스 자동 생성
        try:
            script_path = os.path.join(TEST_MODELS_DIR, "check_assets.py")
            if os.path.exists(script_path):
                subprocess.run(
                    ["python", script_path, "--alias"],
                    cwd=AEGIS_ROOT,
                    capture_output=True,
                )
                stats["alias_generated"] = True
        except Exception as e:
            print(f"Alias error: {e}")

        return stats

    @staticmethod
    def get_reactions():
        """에이기스의 리액션 설정 데이터를 반환합니다."""
        reactions_path = os.path.join(AEGIS_ROOT, "config", "reactions.json")
        if os.path.exists(reactions_path):
            return load_json_config(reactions_path)
        return {}
