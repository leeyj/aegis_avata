import os
import sys
import subprocess

# --- 점검 대상 키워드 ---
FORBIDDEN_KEYWORDS = [
    "az001a",
    "akfelslcl1!",
    "qhdks00!!",
    "/home/az001a",
    # "AIzaSy",  # Gemini API Key (테스트용으로 포함 시 오류 발생 방지를 위해 주석 처리하거나 신중히 결정)
]

# --- 점검 제외 파일/디렉토리 ---
EXCLUDE_FILES = [".gitignore", "privacy_check.py", "secrets.example.json"]


def check_privacy():
    print("[Privacy Check] Git 커밋 전 보안 점검을 시작합니다...")

    # Git에서 관리되는 파일 목록 가져오기
    try:
        files = subprocess.check_output(["git", "ls-files"], text=True).splitlines()
        # 아직 추가되지 않은 신규 파일(Untracked)도 포함
        untracked = subprocess.check_output(
            ["git", "ls-files", "--others", "--exclude-standard"], text=True
        ).splitlines()
        all_files = list(set(files + untracked))
    except Exception as e:
        print(f"Git 정보를 가져오는 데 실패했습니다: {e}")
        return False

    violation_found = False

    for file_path in all_files:
        # 제외 대상 확인
        if any(ex in file_path for ex in EXCLUDE_FILES):
            continue

        if not os.path.isfile(file_path):
            continue

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                for line_num, line in enumerate(f, 1):
                    for keyword in FORBIDDEN_KEYWORDS:
                        if keyword in line:
                            # AI API Key의 경우 코드 내에 있을 때만 알림 (예시용 주석 등은 제외 고려 가능)
                            print(
                                f"[경고] 민감 정보 발견! 파일: {file_path} (Line: {line_num})"
                            )
                            print(f"   ㄴ 발견된 키워드: {keyword}")
                            violation_found = True
        except Exception:
            # 바이너리 파일 등은 무시
            pass

    if violation_found:
        print("\n[실패] 프로젝트 내에 개인정보 또는 민감한 정보가 포함되어 있습니다.")
        print("모든 민감 정보를 제거하거나 .gitignore에 등록한 후 다시 시도하세요.")
        return False
    else:
        print("\n[성공] 프로젝트 내에서 알려진 민감 정보가 발견되지 않았습니다.")
        return True


if __name__ == "__main__":
    if not check_privacy():
        sys.exit(1)
    sys.exit(0)
