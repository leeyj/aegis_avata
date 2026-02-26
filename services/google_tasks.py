from services.google_auth import (
    get_authenticated_service,
    get_auth_token_path,
    get_google_limits,
)


def get_tasks_service():
    """구글 타스크 서비스 객체 생성"""
    scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/tasks",
    ]
    return get_authenticated_service(
        "tasks", "v1", scopes, get_auth_token_path("tasks")
    )


def get_today_tasks():
    """오늘의 할 일 목록 가져오기"""
    service = get_tasks_service()
    if not service:
        return {"status": "AUTH_REQUIRED", "message": "Credentials missing."}

    try:
        results = service.tasklists().list().execute()
        items = results.get("items", [])

        all_tasks = []
        max_tasks = get_google_limits().get("max_tasks", 10)
        for tasklist in items:
            if len(all_tasks) >= max_tasks:
                break

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
                if "[" in title or "]" in title:
                    continue

                all_tasks.append(
                    {
                        "id": task.get("id"),
                        "tasklist_id": tasklist["id"],
                        "title": title,
                        "notes": task.get("notes", ""),
                        "due": task.get("due", ""),
                    }
                )

        return {"status": "SUCCESS", "tasks": all_tasks}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


def add_task(title):
    """새 할 일 추가"""
    service = get_tasks_service()
    if not service:
        return {"status": "AUTH_REQUIRED"}

    try:
        tasklists = service.tasklists().list().execute().get("items", [])
        if not tasklists:
            return {"status": "ERROR", "message": "No tasklist found"}

        task = {"title": title}
        result = (
            service.tasks().insert(tasklist=tasklists[0]["id"], body=task).execute()
        )
        return {"status": "SUCCESS", "task": result}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}


def complete_task(tasklist_id, task_id):
    """할 일 완료 처리"""
    service = get_tasks_service()
    if not service:
        return {"status": "AUTH_REQUIRED"}

    try:
        task = service.tasks().get(tasklist=tasklist_id, task=task_id).execute()
        task["status"] = "completed"
        result = (
            service.tasks()
            .update(tasklist=tasklist_id, task=task_id, body=task)
            .execute()
        )
        return {"status": "SUCCESS", "task": result}
    except Exception as e:
        return {"status": "ERROR", "message": str(e)}
