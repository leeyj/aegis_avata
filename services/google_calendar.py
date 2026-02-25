import os.path
import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from routes.config import (
    CREDENTIALS_PATH,
    GOOGLE_CONFIG_PATH,
    BASE_DIR,
)

# 읽기 전용 권한 설정 (캘린더 및 타스크)
SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/tasks.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
]

import threading
import json


def get_google_limits():
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
    default_mapping = {
        "calendar": "token_personal.json",
        "tasks": "token_personal.json",
        "gmail": "token_work.json",
    }
    config = get_google_limits()
    auth_config = config.get("auth", {})
    filename = auth_config.get(service_name, default_mapping.get(service_name))
    return os.path.join(BASE_DIR, "config", filename)


# 동시 인증 방지를 위한 락
auth_lock = threading.Lock()


def _get_authenticated_service(api_name, version, scopes, token_path):
    """공통 인증 및 서비스 생성 로직 (Thread-safe)"""
    with auth_lock:
        creds = None
        # 기존 토큰 로드 (오류 방지를 위해 try-except 적용)
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

                # Auth Required message removed
                pass

                flow = InstalledAppFlow.from_client_secrets_file(
                    CREDENTIALS_PATH, scopes
                )
                # access_type='offline'과 prompt='consent'를 추가하여 refresh_token을 확실히 받아옴
                creds = flow.run_local_server(
                    port=8080, access_type="offline", prompt="consent"
                )

            with open(token_path, "w") as token:
                token.write(creds.to_json())

    return build(api_name, version, credentials=creds)


def get_google_service():
    """캘린더 서비스 (Tasks 권한 포함)"""
    scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/tasks.readonly",
    ]
    return _get_authenticated_service(
        "calendar", "v3", scopes, get_auth_token_path("calendar")
    )


def get_tasks_service():
    """타스크 서비스 (Calendar 권한 포함)"""
    scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/tasks.readonly",
    ]
    return _get_authenticated_service(
        "tasks", "v1", scopes, get_auth_token_path("tasks")
    )


def get_gmail_service():
    """Gmail 서비스"""
    scopes = ["https://www.googleapis.com/auth/gmail.readonly"]
    return _get_authenticated_service(
        "gmail", "v1", scopes, get_auth_token_path("gmail")
    )


def get_today_events():
    """오늘 전체 일정 가져오기 (현지 시간대 대응)"""
    service = get_google_service()
    if not service:
        return {
            "status": "AUTH_REQUIRED",
            "message": "Google credentials.json is missing in config folder.",
        }

    try:
        # 현지 시간 기준 오늘 시작(00:00)과 끝(23:59) 계산
        now_local = datetime.datetime.now()
        start_of_day = (
            now_local.replace(hour=0, minute=0, second=0, microsecond=0)
            .astimezone()
            .isoformat()
        )
        end_of_day = (
            now_local.replace(hour=23, minute=59, second=59, microsecond=999999)
            .astimezone()
            .isoformat()
        )

        # Debug logging removed
        pass

        max_events = get_google_limits().get("max_events", 10)
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=start_of_day,
                timeMax=end_of_day,
                singleEvents=True,
                orderBy="startTime",
                maxResults=max_events,
            )
            .execute()
        )
        events = events_result.get("items", [])

        result = []
        for event in events:
            start_data = event["start"]
            is_all_day = "dateTime" not in start_data
            start_time = start_data.get("dateTime", start_data.get("date"))
            summary = event.get("summary", "No Title")

            result.append(
                {
                    "summary": summary,
                    "start": start_time,
                    "is_all_day": is_all_day,
                    "location": event.get("location", ""),
                }
            )
        return {"status": "SUCCESS", "events": result}
    except HttpError as error:
        return {"status": "ERROR", "message": str(error)}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


def get_today_tasks():
    """구글 타스크(할 일) 가져오기 - [] 포함 항목 제외"""
    service = get_tasks_service()
    if not service:
        return {"status": "AUTH_REQUIRED", "message": "Credentials missing."}

    try:
        # 1. 태스크 목록(Task Lists) 가져오기
        results = service.tasklists().list().execute()
        items = results.get("items", [])

        all_tasks = []
        max_tasks = get_google_limits().get("max_tasks", 10)
        for tasklist in items:
            if len(all_tasks) >= max_tasks:
                break

            # 2. 각 목록의 할 일들 가져오기
            tasks_result = (
                service.tasks()
                .list(tasklist=tasklist["id"], showCompleted=False)
                .execute()
            )
            tasks = tasks_result.get("items", [])

            for task in tasks:
                if len(all_tasks) >= max_tasks:
                    break

                title = task.get("title", "No Title")
                # [] 대괄호 포함된 제목 제외
                if "[" in title or "]" in title:
                    continue

                all_tasks.append(
                    {
                        "title": title,
                        "notes": task.get("notes", ""),
                        "due": task.get("due", ""),
                    }
                )

        return {"status": "SUCCESS", "tasks": all_tasks}
    except Exception:
        return {"status": "ERROR", "message": "Unknown error"}


def get_recent_emails():
    """최근 이메일 목록 가져오기"""
    service = get_gmail_service()
    if not service:
        return {"status": "AUTH_REQUIRED", "message": "Credentials missing."}

    try:
        max_results = get_google_limits().get("max_emails", 5)
        # 최근 메일 목록 가져오기 (라벨: INBOX, 최대 개수 제한)
        results = (
            service.users()
            .messages()
            .list(userId="me", labelIds=["INBOX"], maxResults=max_results)
            .execute()
        )
        messages = results.get("messages", [])

        emails = []
        for msg in messages:
            msg_data = (
                service.users().messages().get(userId="me", id=msg["id"]).execute()
            )
            headers = msg_data["payload"]["headers"]

            subject = next(
                (h["value"] for h in headers if h["name"].lower() == "subject"),
                "No Subject",
            )
            sender = next(
                (h["value"] for h in headers if h["name"].lower() == "from"), "Unknown"
            )
            snippet = msg_data.get("snippet", "")

            emails.append(
                {
                    "id": msg["id"],
                    "subject": subject,
                    "from": sender,
                    "snippet": snippet,
                }
            )

        return {"status": "SUCCESS", "emails": emails}
    except Exception:
        return {"status": "ERROR", "message": "Unknown error"}
