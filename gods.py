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

    # 내부망 및 외부망 접근 허용을 위해 0.0.0.0 포커싱 (로컬 개발용)
    # SocketIO 지원을 위해 app.run 대신 socketio.run 사용
    from services.socket_service import socketio

    socketio.run(app, host="0.0.0.0", port=PORT, debug=False)
