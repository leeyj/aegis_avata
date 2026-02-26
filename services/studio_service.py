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
    def get_reactions():
        """에이기스의 리액션 설정 데이터를 반환합니다."""
        reactions_path = os.path.join(AEGIS_ROOT, "config", "reactions.json")
        return load_json_config(reactions_path)
