"""
AEGIS Tactical Intelligence Dashboard - Entry Point
"""

from app_factory import create_app

# 애플리케이션 인스턴스 생성
app = create_app()


def is_port_in_use(port):
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0


if __name__ == "__main__":
    import os

    PORT = 8001

    # [v2.3.2] Flask 리로더(Werkzeug)에 의해 실행되는 자식 프로세스인지 확인
    # 리로더가 실행 중일 때는 이미 부모 프로세스가 포트를 점유하려 하거나
    # 포트 감시 상태이므로 자식 프로세스에서의 중복 체크를 건너뜜.
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        if is_port_in_use(PORT):
            print(
                f"Error: Port {PORT} is already in use. Please close the other process."
            )
            import sys

            sys.exit(1)

    # [v3.4.2] 홈 서버 및 클라우드 환경에서 debug=False 실행 시 발생하는
    # Werkzeug RuntimeError 방지를 위해 allow_unsafe_werkzeug 옵션을 공식 활성화합니다.
    # 이는 gunicorn 등을 사용하지 않고 직접 실행하는 모든 사용자에게 필수적인 설정입니다.
    from services.socket_service import socketio

    socketio.run(
        app, host="0.0.0.0", port=PORT, debug=False, allow_unsafe_werkzeug=True
    )
