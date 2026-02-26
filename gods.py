"""
AEGIS Tactical Intelligence Dashboard - Entry Point
"""

from app_factory import create_app

# 애플리케이션 인스턴스 생성
app = create_app()

if __name__ == "__main__":
    # 내부망 및 외부망 접근 허용을 위해 0.0.0.0 포커싱 (로컬 개발용)
    # 실제 운영 서버는 WSGI를 통해 실행됨
    app.run(host="0.0.0.0", port=8001, debug=False)
