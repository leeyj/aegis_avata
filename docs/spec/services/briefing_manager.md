# BriefingManager 모듈 기능 명세서

`services/briefing_manager.py`는 AI 브리핑의 생성, 캐싱, 음성 변환(TTS) 및 선제적 알림(Proactive Alert) 기능을 총괄하는 핵심 매니저 클래스입니다.

---

## 🏗️ 클래스: `BriefingManager`

### 1. `__init__(api_key, text_cache_path, audio_cache_path)`
*   **기능**: 매니저 인스턴스를 초기화하고 Gemini API 키 및 캐시 경로를 설정합니다.
*   **파라미터**:
    - `api_key`: Google Gemini API Key.
    - `text_cache_path`: 브리핑 텍스트(JSON)를 저장할 로컬 경로.
    - `audio_cache_path`: 생성된 MP3 파일을 저장할 로컬 경로.

### 2. `get_briefing(context_data, debug_mode=True)`
*   **기능**: 전체 대시보드 데이터를 기반으로 종합 브리핑을 생성합니다. 개발 모드에서는 파일 캐시를 우선 확인하여 API 호출을 절약합니다.
*   **함수 호출 방법**:
    ```python
    briefing = manager.get_briefing(all_data)
    ```
*   **반환값**: 브리핑 텍스트, 감정 정보, 시각화 타입, 오디오 URL 포함 딕셔너리.

### 3. `get_widget_briefing(widget_type, widget_data)`
*   **기능**: 대시보드의 특정 위젯(예: 뉴스, 주식) 데이터만을 집중 분석하여 짧은 요약 보고를 생성합니다.
*   **함수 호출 방법**:
    ```python
    news_report = manager.get_widget_briefing("news", news_data)
    ```

### 4. `check_proactive(context_data, proactive_config)`
*   **기능**: 금융 지수 급변동이나 일정 임박 등 긴급 상황을 감지하여 AI가 사용자에게 먼저 말을 거는(Alert) 기능을 수행합니다.
*   **내부 로직**:
    1. 지수 변동폭(%) 또는 일정 시작 시간(분)이 설정된 임계치(Threshold)를 넘는지 체크.
    2. 조건 충족 시 Gemini에게 상황 보고 프롬프트를 전달하여 메시지 생성.
    3. 결과가 있을 경우 TTS 음성 파일을 즉시 생성.

### 5. `process_ai_command(command, context_data)`
*   **기능**: 사용자의 자연어 명령(예: "오늘 뉴스 요약해줘", "지수 상태 어때?")을 분석하여 적절한 답변과 액션을 도출합니다.
