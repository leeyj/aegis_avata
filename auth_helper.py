import os
import sys

# 프로젝트 루트를 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.google_calendar import get_tasks_service


def run_auth():
    print("🚀 Google Tasks 권한 인증을 시작합니다...")

    # 기존 로컬 토큰 삭제 (새로운 권한 반영을 위해)
    token_path = os.path.join("config", "token_personal.json")
    if os.path.exists(token_path):
        os.remove(token_path)
        print(f"🗑️ 기존 로컬 토큰({token_path})을 삭제했습니다.")

    try:
        # 인증 프로세스 트리거
        # SCOPES에 https://www.googleapis.com/auth/tasks 가 포함되어 있어야 함
        service = get_tasks_service()
        if service:
            print("✅ 인증 성공! 새로운 토큰이 생성되었습니다.")
    except Exception as e:
        print(f"❌ 인증 실패: {str(e)}")


if __name__ == "__main__":
    run_auth()
