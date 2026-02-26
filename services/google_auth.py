import os.path
import threading
import json
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

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

# 동시 인증 방지를 위한 락
auth_lock = threading.Lock()


def get_google_limits():
    """설정 파일에서 API 호출 제한 값 로드"""
    default_limits = {"max_events": 10, "max_tasks": 10, "max_emails": 5}
    try:
        if os.path.exists(GOOGLE_CONFIG_PATH):
            with open(GOOGLE_CONFIG_PATH, "r", encoding="utf-8") as f:
                limits = json.load(f)
                default_limits.update(limits)
    except Exception:
        pass
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


def get_authenticated_service(api_name, version, scopes, token_path):
    """구글 API 인증 및 서비스 객체 생성 (공통 모듈)"""
    with auth_lock:
        creds = None
        try:
            if os.path.exists(token_path):
                creds = Credentials.from_authorized_user_file(token_path, scopes)
        except Exception:
            creds = None

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                except Exception:
                    creds = None

            if not creds or not creds.valid:
                if not os.path.exists(CREDENTIALS_PATH):
                    return None

                flow = InstalledAppFlow.from_client_secrets_file(
                    CREDENTIALS_PATH, scopes
                )
                creds = flow.run_local_server(
                    port=8080, access_type="offline", prompt="consent"
                )

            with open(token_path, "w") as token:
                token.write(creds.to_json())

    return build(api_name, version, credentials=creds)
