import os.path
import threading
import json
import time
from datetime import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

import os
import sys

# 프로젝트 루트 경로를 sys.path에 추가하여 독립 실행 시에도 모듈을 찾을 수 있게 함
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from routes.config import (
    CREDENTIALS_PATH,
    GOOGLE_CONFIG_PATH,
    BASE_DIR,
)

# 기본 권한 설정
SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/gmail.readonly",
]

auth_lock = threading.Lock()


def log_terminal(message, level="INFO"):
    """서버 터미널에 상세 로그 출력 (다른 PC 테스트용)"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [GOOGLE_AUTH_DEBUG] [{level}] {message}")


def get_google_limits():
    """설정 파일에서 API 호출 제한 값 로드"""
    default_limits = {"max_events": 10, "max_tasks": 10, "max_emails": 5}
    try:
        if os.path.exists(GOOGLE_CONFIG_PATH):
            with open(GOOGLE_CONFIG_PATH, "r", encoding="utf-8") as f:
                limits = json.load(f)
                default_limits.update(limits)
    except Exception as e:
        log_terminal(f"설정 로드 실패: {str(e)}", "WARNING")
    return default_limits


def get_auth_token_path(service_name):
    """서비스 이름에 따른 토큰 파일 경로 반환"""
    default_mapping = {
        "calendar": "token_personal.json",
        "tasks": "token_personal.json",
        "gmail": "token_work.json",
    }
    config = get_google_limits()
    auth_config = config.get("auth", {})
    filename = auth_config.get(service_name, default_mapping.get(service_name))
    return os.path.join(BASE_DIR, "config", filename)


def get_authenticated_service_debug(api_name, version, scopes, token_path):
    """
    구글 API 인증 및 서비스 객체 생성 (로그 강화 디버그 버전)
    기존 원본과 충돌하지 않도록 별도의 메서드로 구현
    """
    log_terminal(f"'{api_name}' 서비스 인증 절차 개시 (토큰 경로: {token_path})")

    with auth_lock:
        creds = None
        # 1. 기존 토큰 확인
        if os.path.exists(token_path):
            try:
                log_terminal(f"기존 토큰 발견. 로드 시도 중...")
                creds = Credentials.from_authorized_user_file(token_path, scopes)
                log_terminal("기존 토큰 로드 성공.")
            except Exception as e:
                log_terminal(f"기존 토큰 로드 중 오류 발생: {str(e)}", "ERROR")
                creds = None

        # 2. 토큰 유효성 검사 및 갱신
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    log_terminal("토큰 만료됨. Access Token 갱신 시도 중...")
                    creds.refresh(Request())
                    log_terminal("Access Token 갱신 완료.")
                except Exception as e:
                    log_terminal(f"토큰 갱신 실패: {str(e)}", "ERROR")
                    creds = None

            # 3. 새로운 인증 (브라우저 로그인)
            if not creds or not creds.valid:
                log_terminal(
                    "유효한 토큰 없음. 신규 인증(OAuth2 Flow)을 시작합니다.",
                    "IMPORTANT",
                )

                if not os.path.exists(CREDENTIALS_PATH):
                    log_terminal(
                        f"오류: '{CREDENTIALS_PATH}' 파일이 없습니다. Google Cloud Console에서 인증 정보를 생성하세요.",
                        "CRITICAL",
                    )
                    return None

                try:
                    log_terminal(
                        f"'{CREDENTIALS_PATH}'로부터 클라이언트 정보 로드 중..."
                    )
                    flow = InstalledAppFlow.from_client_secrets_file(
                        CREDENTIALS_PATH, scopes
                    )

                    log_terminal(
                        "로컬 서버 가동 중... 브라우저에서 로그인을 완료해 주세요. (Port: 8080)",
                        "IMPORTANT",
                    )
                    creds = flow.run_local_server(
                        port=8080, access_type="offline", prompt="consent"
                    )
                    log_terminal("사용자 인증 완료 및 새로운 Credential 획득 성공.")
                except Exception as e:
                    log_terminal(f"인증 흐름 중 예외 발생: {str(e)}", "CRITICAL")
                    return None

            # 4. 획득한 토큰 저장
            try:
                log_terminal(f"갱신/획득된 토큰을 파일로 저장 중: {token_path}")
                with open(token_path, "w") as token:
                    token.write(creds.to_json())
                log_terminal("토큰 저장 완료.")
            except Exception as e:
                log_terminal(f"토큰 저장 실패: {str(e)}", "ERROR")

    try:
        log_terminal(f"'{api_name}' ({version}) 서비스 빌드 중...")
        service = build(api_name, version, credentials=creds)
        log_terminal(f"'{api_name}' 서비스 빌드 성공. 최종 객체 반환.")
        return service
    except Exception as e:
        log_terminal(f"서비스 빌드 실패: {str(e)}", "CRITICAL")
        return None


if __name__ == "__main__":
    # 독립 실행 테스트용
    print("\n" + "=" * 50)
    print(" AEGIS Google Auth Debugging Tool")
    print("=" * 50)

    test_path = os.path.join(BASE_DIR, "config", "token_test_debug.json")
    get_authenticated_service_debug("calendar", "v3", SCOPES, test_path)
