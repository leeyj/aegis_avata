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
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/tasks",
    ]
    return get_authenticated_service(
        "calendar", "v3", scopes, get_auth_token_path("calendar")
    )


def create_event(summary, start_time_str, duration_minutes=60):
    """새로운 일정 생성"""
    service = get_google_service()
    if not service:
        return {"status": "AUTH_REQUIRED"}

    try:
        # [v3.7.5] 시간 파싱 유연화
        start_time_str = start_time_str.strip()
        now = datetime.datetime.now()

        try:
            # 1. 표준 포맷 (YYYY-MM-DD HH:MM)
            start_dt = datetime.datetime.strptime(start_time_str, "%Y-%m-%d %H:%M")
        except ValueError:
            try:
                # 2. 시간만 입력된 경우 (HH:MM) -> 오늘로 가정
                time_only = datetime.datetime.strptime(start_time_str, "%H:%M").time()
                start_dt = datetime.datetime.combine(now.date(), time_only)
            except ValueError:
                # 3. 기타 예외 (파싱 실패 시 현재 시간 + 1시간 기본값)
                start_dt = now + datetime.timedelta(hours=1)
        end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)

        event = {
            "summary": summary,
            "start": {
                "dateTime": start_dt.astimezone().isoformat(),
                "timeZone": "Asia/Seoul",
            },
            "end": {
                "dateTime": end_dt.astimezone().isoformat(),
                "timeZone": "Asia/Seoul",
            },
        }

        event = service.events().insert(calendarId="primary", body=event).execute()
        return {"status": "SUCCESS", "event_id": event.get("id")}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


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

        max_events = get_google_limits("calendar").get("max_events", 10)
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
