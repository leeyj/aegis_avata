from flask_socketio import SocketIO
import logging

logger = logging.getLogger(__name__)

# 전역 SocketIO 인스턴스 (순환 참조 방지를 위해 서비스 레이어에 정의)
# async_mode='threading': Werkzeug 개발 서버 호환 (eventlet/gevent 미설치 환경)
socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")


def emit_to_hud(event: str, data: dict):
    """모든 연결된 HUD(데스크탑 모드 등)에 이벤트 전송"""
    try:
        print(f"[SocketService] 🚀 Preparing to emit '{event}'...")
        # 디버그: socketio 인스턴스 정보 확인
        print(
            f"[SocketService] SocketIO Instance state: server={hasattr(socketio, 'server')} / {socketio.server}"
        )
        socketio.emit(event, data)
        print(f"[SocketService] ✅ SocketIO Emit Success: {event}")
        logger.info(f"SocketIO Emit: {event}")
    except Exception as e:
        print(f"[SocketService] 🚨 SocketIO Emit Failed: type={type(e)}, msg={e}")
        import traceback

        traceback.print_exc()
        logger.error(f"SocketIO Emit Failed: {e}")


@socketio.on("connect")
def handle_connect():
    logger.info("A client connected via SocketIO")


@socketio.on("disconnect")
def handle_disconnect():
    logger.info("A client disconnected from SocketIO")
