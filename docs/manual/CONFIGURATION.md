# ⚙️ AEGIS 통합 설정 가이드 (Complete Configuration Guide)

이 문서는 AEGIS 시스템의 모든 동작을 제어하는 `config/` 디렉토리 내 모든 설정 파일에 대한 통합 가이드입니다. 사용자는 이 문서를 참조하여 시스템의 외형, 지능, 보안 등을 완벽하게 커스터마이징할 수 있습니다.

---

## 1. 핵심 시스템 설정 (Core System)

### 1.1 `api.json` (AI 연동 및 모델 설정)
터미널에서 선택 가능한 외부 AI 엔진(Grok, Ollama 등)의 연결 정보를 관리합니다.
- `default_source`: 대시보드 시작 시 기본 선택될 AI 키.
- `sources.{key}.model`: 호출할 AI 모델 이름 (예: `grok-4-1-fast-reasoning`).
- `sources.{key}.api_type`: `ollama` (로컬) 또는 `openai` (외부 서비스 호환).
- `sources.{key}.active`: 시스템 활성화 여부.
- `sources.{key}.mock`: `true` 설정 시 실제 API 비용 지출 없이 응답 시뮬레이션 가능.

### 1.2 `secrets.json` (보안 및 API 키)
⚠️ **가장 중요한 파일**로, 절대 외부에 공유하지 마십시오.
- `GEMINI_API_KEY`: 핵심 분석 및 자동 브리핑용 구글 제미나이 키.
- `AI_PROVIDER_KEYS`: xAI(Grok), OpenAI 등 엔진별 실제 서비스 키.
- `EXTERNAL_API_KEYS`: 터미널 위젯과 서버 간 통신 보안용 인터페이스 키.
- `USER_CREDENTIALS`: 대시보드 로그인용 사용자 ID/PW.

### 1.3 `system.json` (서버 모니터링)
- `disks`: 모니터링할 저장 장치 경로 (예: `Nas`, `Root` 등).
- `show_cpu / show_memory`: 리소스 막대 그래프 표시 여부.

---

## 2. 지능형 비서 설정 (Intelligent Assistant)

### 2.1 `prompts.json` (페르소나 및 지침)
비서의 말투와 응답 전략을 결정합니다. (상세 내용은 [프롬프트 가이드](./prompts.md) 참조)
- `DASHBOARD_INTERNAL`: 브리핑 및 선제적 알림 말투.
- `EXTERNAL_AI_HUB`: 터미널 질의 시 각 AI 엔진별 맞춤 지침 (Grok, Ollama 등).
- `NLP_COMMAND_ENGINE`: 자연어 명령 분석 규칙.

### 2.2 `proactive.json` (선제적 알림 기준)
비서가 특정 상황에서 먼저 말을 거는 임계값을 설정합니다.
- `thresholds.finance_change_abs`: 주가지수가 일정 % 이상 변동 시 알림.
- `thresholds.calendar_lead_time_min`: 일정 시작 전 알림 시간(분).
- `thresholds.system_cpu_percent`: CPU 부하가 높을 때 알림 기준.

### 2.3 `tts.json` (목소리 설정)
- `lang`: 목소리 언어 (기본 `ko-KR`).
- `rate / pitch`: 목소리 속도와 톤 높낮이 조절.

---

## 3. 위젯 및 리액션 (Widgets & Reactions)

### 3.1 실시간 데이터 위젯 관련
- **`weather.json`**: 조회 도시(`city`) 및 갱신 주기(`update_interval_min`) 설정.
- **`finance.json`**: 대시보드 상단에 표시할 시장 지수(`tickers`) 및 폰트 크기.
- **`ticker.json`**: 관심 종목(`tickers`) 및 급등락 알림 기준(`alert_threshold`).
- **`news.json`**: RSS 피드 주소(`rss_urls`) 및 표시할 기사 수(`max_items`).
- **`clock.json`**: 시계 표시 형식(`format`) 및 텍스트 색상(`color`).
- **`google.json`**: 캘린더, 할 일, 지메일 연동 옵션 및 인증 토큰 지정.

### 3.2 `reactions.json` (아바타 자동 반응)
데이터 변화에 따라 아바타가 수행할 모션과 대사 규칙입니다. (상세 내용은 [리액션 가이드](./reactions_guide.md) 참조)
- `condition`: 반응이 발동될 조건 (예: `change_pct >= 3`).
- `actions`: 수행할 모션(`MOTION`), 표정(`EMOTION`), 대사(`TTS`)의 집합.

### 3.3 `bref.json` (UI 스타일)
- `color`: 아바타 말풍선의 배경색 및 투명도.
- `max_width / font_size`: 말풍선 가독성 조절.

---

## 4. 커스터마이징 팁
1. **서버 재시작**: 대부분의 JSON 설정 변경은 서버를 재시작하거나 페이지를 새로고침해야 반영됩니다.
2. **백업 권장**: 설정 변경 전 `config/` 디렉토리를 백업해두면 문제 발생 시 쉽게 복구할 수 있습니다.
3. **오류 해결**: JSON 파일에 오타(`쉼표`, `중괄호` 누락 등)가 있으면 서버 구동에 실패할 수 있으니 주의하십시오.

---
*최종 업데이트: 2026-02-27*
