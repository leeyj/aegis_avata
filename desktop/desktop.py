import sys
from PyQt5.QtCore import Qt, QUrl
from PyQt5.QtWidgets import QApplication, QMainWindow
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEnginePage

class TransparentWebView(QMainWindow):
    def __init__(self):
        super().__init__()

        # 1. 창의 타이틀바를 없애고 항상 위에 오도록 설정
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint)
        
        # 2. 배경을 투명하게 설정
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        self.browser = QWebEngineView()
        
        # 3. 웹 엔진 배경색을 투명하게 설정 (핵심)
        self.browser.page().setBackgroundColor(Qt.transparent)
        
        # Flask 주소 연결
        self.browser.setUrl(QUrl("http://localhost:8001"))
        
        self.setCentralWidget(self.browser)
        self.resize(800, 600)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = TransparentWebView()
    window.show()
    sys.exit(app.exec_())