from functools import wraps
from flask import session, redirect, url_for


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "logged_in" not in session:
            from flask import request

            return redirect(url_for("auth.login", next=request.url))
        return f(*args, **kwargs)

    return decorated_function


def standardized_plugin_response(f):
    """
    플러그인 전용 API 응답 표준화 데코레이터:
    - 실행 중 예외 발생 시 서버가 HTML 500 페이지를 던지는 것을 차단
    - 대신 표준 JSON 에러 포맷으로 반환하여 프론트엔드 크래시 방지
    """
    from flask import jsonify
    import traceback

    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            print(f"[Plugin-X Error] Exception in route {f.__name__}: {e}")
            traceback.print_exc()
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": str(e),
                        "type": "PluginExecutionError",
                    }
                ),
                500,
            )

    return decorated_function
