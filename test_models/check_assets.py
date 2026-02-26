import os
import json
import argparse
import re
import sys

# --- Alias Keyword Mapping (Advanced Inference Version) ---
# 한문, 한글, 일본어, 숫자, 특수 패턴을 포함한 범용 추론 사전
ALIAS_KEYWORDS = {
    "motions": {
        "idle": {
            "primary": [
                "idle",
                "wait",
                "stand",
                "base",
                "loop",
                "01",
                "待机",
                "待機",
                "기본",
                "대기",
                "正常",
                "日常",
            ],
            "secondary": [
                "循环",
                "循環",
                "stay",
                "standard",
                "breath",
                "c1",
                "z1",
                "idle_01",
            ],
        },
        "joy": {
            "primary": [
                "joy",
                "happy",
                "smile",
                "laugh",
                "glad",
                "02",
                "高兴",
                "笑",
                "기쁨",
                "행복",
                "웃음",
                "喜",
            ],
            "secondary": ["smile_01", "touch_01", "pat", "head", "摸头", "摸", "좋아"],
        },
        "shock": {
            "primary": [
                "shock",
                "surprise",
                "scared",
                "panic",
                "03",
                "惊讶",
                "吓",
                "깜짝",
                "惊",
                "震惊",
            ],
            "secondary": ["shake", "shout", "surprise_01", "놀람", "헉"],
        },
        "sad": {
            "primary": [
                "sad",
                "cry",
                "sob",
                "grief",
                "depress",
                "04",
                "悲伤",
                "哭",
                "슬픔",
                "울음",
                "哀",
            ],
            "secondary": ["cry_01", "sadness", "shame", "shy", "害羞"],
        },
        "thinking": {
            "primary": [
                "think",
                "ponder",
                "suspect",
                "wonder",
                "05",
                "思考",
                "想",
                "생각",
                "고민",
                "疑",
            ],
            "secondary": ["wonder_01", "question", "doubt"],
        },
        "dance": {
            "primary": [
                "dance",
                "sing",
                "rhythm",
                "jump",
                "hop",
                "swing",
                "歌",
                "跳舞",
                "노래",
                "춤",
                "舞",
            ],
            "secondary": ["music", "play", "active", "happy_dance"],
        },
    },
    "expressions": {
        "joy": [
            "joy",
            "happy",
            "smile",
            "love",
            "f02",
            "f01",
            "笑",
            "高兴",
            "웃음",
            "喜",
            "좋아",
        ],
        "sad": [
            "sad",
            "cry",
            "sob",
            "shame",
            "f03",
            "f07",
            "哭",
            "悲伤",
            "슬픔",
            "哀",
            "울음",
        ],
        "angry": ["angry", "rage", "mad", "f04", "怒", "화남", "生气", "Mad"],
        "shock": ["shock", "surprise", "f05", "f06", "惊讶", "놀람", "惊"],
    },
}


def check_file_exists(base_path, rel_path, label):
    """파일 존재 여부 체크"""
    full_path = os.path.join(base_path, rel_path)
    return os.path.exists(full_path)


def find_best_match(file_list, target_alias, keywords_dict):
    """추론 로직을 동원하여 가장 적합한 파일을 찾음"""
    # 1. Primary Keywords (가장 높은 정확도)
    for kw in keywords_dict["primary"]:
        for file in sorted(file_list):
            if kw.lower() in file.lower():
                return file

    # 2. Secondary Keywords (차선책 패턴)
    for kw in keywords_dict["secondary"]:
        for file in sorted(file_list):
            if kw.lower() in file.lower():
                return file

    # 3. 숫자 기반 추론 (01, 02 등)
    fallback_nums = {
        "idle": "01",
        "joy": "02",
        "shock": "03",
        "sad": "04",
        "thinking": "05",
    }
    if target_alias in fallback_nums:
        num = fallback_nums[target_alias]
        for filename in sorted(file_list):
            if num in filename:
                return filename

    # 4. 강제 추론 (Idle 한정): 아무것도 없으면 가장 파일명이 짧거나 첫 번째 파일 선택
    if target_alias == "idle" and file_list:
        return sorted(file_list, key=len)[0]

    return None


def generate_alias_file(model_path, motions, expressions):
    """모델별 alias.json 생성"""
    aliases = {"motions": {}, "expressions": {}}

    # 모션 매핑 (추론 엔진 가동)
    for alias, kw_groups in ALIAS_KEYWORDS["motions"].items():
        match = find_best_match(motions, alias, kw_groups)
        if match:
            aliases["motions"][alias] = match

    # 표정 매핑
    for alias, kws in ALIAS_KEYWORDS["expressions"].items():
        # 표정용 간이 매칭 로직
        for kw in kws:
            found = False
            for file in sorted(expressions):
                if kw.lower() in file.lower():
                    aliases["expressions"][alias] = file
                    found = True
                    break
            if found:
                break

    target_path = os.path.join(model_path, "alias.json")
    try:
        # 매칭된 자산이 하나라도 있거나, 강제로라도 생성해야 할 때 (Idle 확보 시)
        if aliases["motions"] or aliases["expressions"]:
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(aliases, f, indent=4, ensure_ascii=False)
            return True, aliases
    except Exception as e:
        print(f"  [ERROR] {str(e)}")
    return False, aliases


def analyze_directory(base_dir, label, fix_naming=False, gen_alias=False):
    if not os.path.exists(base_dir):
        return
    print(f"[*] [{label}] 추론 엔진 가동 및 검증 시작\n")

    items = sorted(os.listdir(base_dir))
    for item in items:
        item_path = os.path.join(base_dir, item)
        if not os.path.isdir(item_path) or item.startswith("."):
            continue

        model_config_file = None
        current_model_path = item_path

        # 모델 설정 탐색
        for f in os.listdir(item_path):
            if f.endswith(".model3.json"):
                model_config_file = f
                break
        if not model_config_file:
            for sub in os.listdir(item_path):
                sub_p = os.path.join(item_path, sub)
                if os.path.isdir(sub_p):
                    for f in os.listdir(sub_p):
                        if f.endswith(".model3.json"):
                            model_config_file = f
                            current_model_path = sub_p
                            break
                    if model_config_file:
                        break

        if not model_config_file:
            continue

        print(f"============================================================")
        print(f"[*] 모델명: {item}")

        motions_found = []
        expressions_found = []

        # 자산 탐색
        for sub in ["animations", "motions"]:
            p = os.path.join(current_model_path, sub)
            if os.path.exists(p):
                motions_found.extend(
                    [f"{sub}/{f}" for f in os.listdir(p) if f.endswith(".motion3.json")]
                )

        p_exp = os.path.join(current_model_path, "expressions")
        if os.path.exists(p_exp):
            expressions_found.extend(
                [
                    f"expressions/{f}"
                    for f in os.listdir(p_exp)
                    if f.endswith(".exp3.json")
                ]
            )

        if gen_alias:
            success, generated = generate_alias_file(
                current_model_path, motions_found, expressions_found
            )
            if success:
                print(f"  [SUCCESS] 지능형 매칭 성공")
                print(f"  - 모션: {', '.join(generated['motions'].keys())}")
                if generated["expressions"]:
                    print(f"  - 표정: {', '.join(generated['expressions'].keys())}")
            else:
                print(f"  [SKIP] 추론 불가능한 모델입니다.")
        print(f"============================================================\n")


def check_sponsor_key():
    """Check for valid Sponsor Key to unlock premium features."""
    secrets_path = os.path.join(os.getcwd(), "config", "secrets.json")
    if not os.path.exists(secrets_path):
        return False

    try:
        with open(secrets_path, "r", encoding="utf-8") as f:
            secrets = json.load(f)
            # Placeholder validation: In reality, you could use a remote verification or a specific key format
            return bool(secrets.get("SPONSOR_KEY"))
    except Exception:
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Live2D Asset Validator & Alias Generator"
    )
    parser.add_argument(
        "--fix", action="store_true", help="Fix file naming conventions"
    )
    parser.add_argument(
        "--alias",
        action="store_true",
        help="[PREMIUM] Generate alias.json (Sponsors only)",
    )
    args = parser.parse_args()

    # Premium Feature Check
    should_gen_alias = False
    if args.alias:
        if check_sponsor_key():
            should_gen_alias = True
        else:
            print("\n" + "=" * 60)
            print("💎 [PREMIUM FEATURE] Alias auto-generation is for Sponsors only.")
            print("   Get your Sponsor Key at: https://github.com/sponsors/leeyj")
            print("=" * 60 + "\n")
            sys.exit(0)

    analyze_directory(
        os.path.join(os.getcwd(), "test_models"),
        "Test Models",
        fix_naming=args.fix,
        gen_alias=should_gen_alias,
    )
