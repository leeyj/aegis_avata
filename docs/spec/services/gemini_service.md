# GeminiService 모듈 기능 명세서

`services/gemini_service.py`는 Google의 최신 `Gemini 2.0 Flash` 모델을 사용하여 자연어 이해(NLU) 및 텍스트 생성을 담당하는 통신 계층입니다.

---

## 🏗️ 주요 기능 (Functions)

### 1. `get_briefing(api_key, context_data)`
*   **기능**: `config/prompts.json`에 정의된 `briefing` 프롬프트 템플릿을 사용하여 전체 대시보드 상황을 전략적으로 분석한 JSON 보고서를 생성합니다.
*   **입력**: API Key, 전체 위젯 데이터(JSON).
*   **출력**: 브리핑 텍스트 및 감정 상태가 포함된 JSON 객체.

### 2. `get_widget_briefing(api_key, widget_type, widget_data)`
*   **기능**: 특정 위젯 전용 프롬프트를 사용하여 해당 데이터를 요약합니다.
*   **입력**: 위젯 종류(news, finance 등), 해당 위젯의 실제 데이터.

### 3. `process_command(api_key, command, context_data)`
*   **기능**: 사용자의 질문이나 명령에 대해 답변하거나, 특정 위젯을 조작해야 하는 '액션(Action)'을 판단합니다.
*   **반환 형식**:
    ```json
    {
      "response": "답변 내용",
      "action": "widget_focus / music_play / null",
      "target": "목표 위젯명",
      "sentiment": "happy/serious/..."
    }
    ```

### 4. `get_custom_response(api_key, prompt)`
*   **기능**: 고정된 템플릿 없이 자유로운 프롬프트를 전달하여 AI의 분석 결과를 JSON으로 받습니다. 선제적 알림(Proactive) 기능에서 주로 활용됩니다.

---

## 🛡️ 안정성 설계 (Robustness)
*   **JSON 블록 정제**: Gemini 응답에 포함될 수 있는 마크다운 코드 블록(```json ... ```)을 자동으로 탐지하여 순수 JSON 데이터만 추출합니다.
*   **예외 처리**: API 장애 발생 시 사용자에게 친절한 "기술적 오류" 메시지와 기본 감정 상태를 반환하여 시스템 중단을 방지합니다.
