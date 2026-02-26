import os
import json


def check_missing_aliases():
    base_dir = "test_models"
    if not os.path.exists(base_dir):
        print(f"[!] 디렉토리를 찾을 수 없습니다: {base_dir}")
        return

    print(f"\n{'=' * 60}")
    print(f"{'Live2D 알리아스(Alias) 누락 모델 리포트':^54}")
    print(f"{'=' * 60}")
    print(f"{'모델명':<25} | {'상태':<15} | {'비고'}")
    print(f"{'-' * 60}")

    missing_count = 0
    items = sorted(os.listdir(base_dir))

    for item in items:
        item_path = os.path.join(base_dir, item)
        # 폴더가 아니거나 시스템 폴더(.git 등)인 경우 제외
        if not os.path.isdir(item_path) or item.startswith("."):
            continue

        # .model3.json 파일이 있는 '진짜 모델 폴더'만 검사 대상
        is_model_folder = False
        alias_path = None

        # 실제 모델 파일이 어디 있는지 재탐색 (최대 1단계 하위까지)
        search_paths = [item_path]
        for sub in os.listdir(item_path):
            sub_p = os.path.join(item_path, sub)
            if os.path.isdir(sub_p):
                search_paths.append(sub_p)

        for p in search_paths:
            if any(f.endswith(".model3.json") for f in os.listdir(p)):
                is_model_folder = True
                alias_path = os.path.join(p, "alias.json")
                break

        if not is_model_folder:
            continue

        # 상태 판별
        status = "정상"
        note = "-"

        if not os.path.exists(alias_path):
            status = "파일 누락"
            note = "alias.json 없음"
            missing_count += 1
        else:
            try:
                with open(alias_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                motions = data.get("motions", {})
                expressions = data.get("expressions", {})

                if not motions and not expressions:
                    status = "내용 비어있음"
                    note = "매핑된 자산이 0개"
                    missing_count += 1
            except Exception as e:
                status = "파일 오류"
                note = f"JSON 읽기 실패 ({str(e)})"
                missing_count += 1

        # 누락되었거나 오류가 있는 것만 출력 (또는 전체를 보려면 필터 제거)
        if status != "정상":
            print(f"{item:<25} | {status:<15} | {note}")

    print(f"{'-' * 60}")
    if missing_count == 0:
        print(f"[*] 모든 모델의 알리아스가 정상적으로 설정되어 있습니다.")
    else:
        print(f"[!] 총 {missing_count}개의 모델에서 알리아스 설정이 필요합니다.")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    check_missing_aliases()
