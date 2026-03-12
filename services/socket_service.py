from flask_socketio import SocketIO
import logging

logger = logging.getLogger(__name__)

# 전역 SocketIO 인스턴스 (순환 참조 방지를 위해 서비스 레이어에 정의)
# async_mode='threading': Werkzeug 개발 서버 호환 (eventlet/gevent 미설치 환경)
socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")


from typing import Optional

def emit_to_hud(event: str, data: dict, sid: Optional[str] = None):
    """특정 클라이언트(sid) 또는 모든 클라이언트에 이벤트 전송"""
    try:
        if sid:
            print(f"[SocketService] 🚀 Target Emit to '{sid}': {event}")
            socketio.emit(event, data, to=sid)
        else:
            print(f"[SocketService] 🚀 Broadcasting to all: {event}")
            socketio.emit(event, data)
        print(f"[SocketService] ✅ SocketIO Emit Success: {event}")
        logger.info(f"SocketIO Emit: {event} (Target: {sid if sid else 'ALL'})")
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
