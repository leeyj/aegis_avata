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

# Sensitive keywords/patterns to check (Loaded from .env if possible, or defined here)
# Important: These are the values we want to NEVER see in our code.
FORBIDDEN_KEYWORDS = [
    "akfelslcl1!",  # Server Password
    "qhdks00!!",  # Secondary Password
    "az001a",  # Username
]

FORBIDDEN_PATTERNS = {
    "Google/Gemini API Key": r"AIza[0-9A-Za-z\-_]{35}",
    "Notion API Token": r"secret_[a-zA-Z0-9]{43}",
    "GitHub Token": r"gh[pousr]_[a-zA-Z0-9]{36}",
    "AWS Access Key": r"AKIA[0-9A-Z]{16}",
    "RSA Private Key": r"-----BEGIN RSA PRIVATE KEY-----",
}

# Directories and files to exclude from scanning
EXCLUDE_DIRS = [".git", "__pycache__", "venv", "node_modules", "build"]
EXCLUDE_FILES = [
    "privacy_check.py",
    ".gitignore",
    "secrets.example.json",
    "settings.example.json",
    ".env.example",
]
BINARY_EXTENSIONS = [".so", ".pyd", ".dll", ".exe", ".bin"]


def check_privacy():
    print("\n[Privacy Guard] 검사를 시작합니다...")

    # Get total tracked files and modified files if in hook mode
    try:
        # Check current staged changes (for pre-commit hook) or all files
        # Here we scan all files to be safe
        files = subprocess.check_output(["git", "ls-files"], text=True).splitlines()
        # Also include currently modified but not yet tracked files
        modified = subprocess.check_output(
            ["git", "diff", "--name-only", "--cached"], text=True
        ).splitlines()
        all_files = list(set(files + modified))
    except Exception as e:
        print(f"Git 정보를 가져오는 데 실패했습니다: {e}")
        return False

    violation_found = False
    compiled_patterns = {
        name: re.compile(ptn) for name, ptn in FORBIDDEN_PATTERNS.items()
    }

    for file_path in all_files:
        if (
            any(d in file_path for d in EXCLUDE_DIRS)
            or any(f == os.path.basename(file_path) for f in EXCLUDE_FILES)
            or any(file_path.lower().endswith(ext) for ext in BINARY_EXTENSIONS)
        ):
            continue

        if not os.path.isfile(file_path):
            continue

        try:
            with open(file_path, "rb") as f:
                content = f.read()

            # 1. Binary Keyword Check (Most reliable)
            for keyword in FORBIDDEN_KEYWORDS:
                if keyword.encode() in content:
                    print(f"❌ [ALERT] 민감 키워드 발견: '{keyword}'")
                    print(f"   위치: {file_path}")
                    violation_found = True

            # 2. Regex Pattern Check
            text_content = content.decode("utf-8", errors="ignore")
            for name, pattern in compiled_patterns.items():
                if pattern.search(text_content):
                    print(f"❌ [ALERT] {name} 패턴 발견")
                    print(f"   위치: {file_path}")
                    violation_found = True

        except Exception:
            pass

    if violation_found:
        print(
            "\n[FAILED] 보안 위반 사항이 발견되었습니다. 코드를 수정하고 다시 시도하세요."
        )
        return False
    else:
        print("\n[PASSED] 보안 점검을 통과했습니다.")
        return True


if __name__ == "__main__":
    if not check_privacy():
        sys.exit(1)
    sys.exit(0)
