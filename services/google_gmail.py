from services.google_auth import (
    get_authenticated_service,
    get_auth_token_path,
    get_google_limits,
)


def get_gmail_service():
    """Gmail 서비스 객체 생성"""
    scopes = ["https://www.googleapis.com/auth/gmail.readonly"]
    return get_authenticated_service(
        "gmail", "v1", scopes, get_auth_token_path("gmail")
    )


def get_recent_emails():
    """최근 수신 이메일 목록 가져오기"""
    service = get_gmail_service()
    if not service:
        return {"status": "AUTH_REQUIRED", "message": "Credentials missing."}

    try:
        max_results = get_google_limits().get("max_emails", 5)
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
