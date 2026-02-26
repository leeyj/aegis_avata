import datetime
from googleapiclient.errors import HttpError
from services.google_auth import (
    get_authenticated_service,
    get_auth_token_path,
    get_google_limits,
)


def get_google_service():
    """구글 캘린더 서비스 객체 생성"""
    scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/tasks",
    ]
    return get_authenticated_service(
        "calendar", "v3", scopes, get_auth_token_path("calendar")
    )


def get_today_events():
    """오늘의 캘린더 일정 가져오기"""
    service = get_google_service()
    if not service:
        return {
            "status": "AUTH_REQUIRED",
            "message": "Google credentials.json is missing in config folder.",
        }

    try:
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


# 하위 호환성을 위해 google_tasks와 google_gmail의 주요 함수들을 노출 (선택 사항)
from services.google_tasks import add_task, complete_task, get_today_tasks
from services.google_gmail import get_recent_emails
