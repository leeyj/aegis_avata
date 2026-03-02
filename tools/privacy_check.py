import os
import sys
import io
import subprocess
import re

# Fix Korean character encoding for Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
    except Exception:
        pass

# Sensitive keywords/patterns to check
# --- 1. 단순 키워드 점검 대상 ---
FORBIDDEN_KEYWORDS = [
    "az001a",
    "akfelslcl1!",
    "qhdks00!!",
    "/home/az001a",
]

# --- 2. 정규식(Regex) 점검 패턴 ---
FORBIDDEN_PATTERNS = {
    "Google/Gemini API Key": r"AIza[0-9A-Za-z\-_]{35}",
    "Notion API Token": r"secret_[a-zA-Z0-9]{43}",
    "GitHub Token": r"gh[pousr]_[a-zA-Z0-9]{36}",
    "AWS Access Key": r"AKIA[0-9A-Z]{16}",
    "Slack Token": r"xox[baprs]-[0-9]{10,13}-[a-zA-Z0-9]{24}",
    "RSA Private Key": r"-----BEGIN RSA PRIVATE KEY-----",
    "Generic Bearer Token": r"Bearer\s+[a-zA-Z0-9\-\._~+/]{30,}=*",
}

# --- 점검 제외 파일/디렉토리 ---
EXCLUDE_FILES = [
    ".gitignore",
    "privacy_check.py",
    "secrets.example.json",
    "config.example.json",
    "AI_AGENT_PROMPT.md",
    "FRAMEWORK_REFERENCE.md",
    "ROADMAP.md",
    "HANDOVER_SESSION.md",
]


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

    # 정규식 패턴 미리 컴파일
    compiled_patterns = {
        name: re.compile(pattern) for name, pattern in FORBIDDEN_PATTERNS.items()
    }

    for file_path in all_files:
        # 제외 대상 확인
        if any(ex in file_path for ex in EXCLUDE_FILES):
            continue

        if not os.path.isfile(file_path):
            continue

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                for line_num, line in enumerate(f, 1):
                    # 1. 키워드 검사
                    for keyword in FORBIDDEN_KEYWORDS:
                        if keyword in line:
                            print(
                                f"[경고] 민감 정보(키워드) 발견! 파일: {file_path} (Line: {line_num})"
                            )
                            print(f"   ㄴ 발견된 키워드: {keyword}")
                            violation_found = True

                    # 2. 정규식 패턴 적용 (API Key 조회)
                    for name, pattern in compiled_patterns.items():
                        if pattern.search(line):
                            print(
                                f"[경고] 민감 정보({name} 패턴) 발견! 파일: {file_path} (Line: {line_num})"
                            )
                            # 너무 길면 100자까지만 자르기
                            print(f"   ㄴ 라인 내용: {line.strip()[:100]}")
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
