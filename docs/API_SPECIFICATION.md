# AEGIS External AI Interface Standard (v1.1)

이 문서는 외부 AI 엔진(Ollama, Grok, ChatGPT 등)이나 외부 시스템이 AEGIS 아바타 및 대시보드와 상호작용하기 위한 표준 API 규격을 정의합니다. 특히 v1.1에서는 다중 AI 허브 아키텍처가 반영되었습니다.

---

## 1. 기본 정보

- **Base URL**: `http://<your-server-ip>:8001/api/v1/external`
- **Content-Type**: `application/json`
- **인증 방식**: HTTP Header 내 `X-AEGIS-API-KEY` 포함
  - 해당 키는 `secrets.json`의 `EXTERNAL_API_KEYS` 내 서비스별 인터페이스 키와 매칭되어야 합니다.

---

## 2. 엔드포인트 규격

### 2.1 모델 설정 조회 (`/config`)
현재 AEGIS에 등록되어 활성화된 AI 모델 리스트와 설정을 조회합니다.

- **Method**: `GET`
- **Response**: `api.json`에 정의된 전체 소스 설정 정보

### 2.2 아바타 제어 명령 수신 (`/interact`)
외부 AI 시스템이 AEGIS 아바타에게 직접 발화나 동작을 지시합니다.

- **Method**: `POST`
- **Request Body**:
| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| `command` | String | O | `speak` (TTS), `action` (Motion) |
| `payload` | Object | O | 명령 상세 데이터 (`text`, `motion`, `interrupt` 등) |

### 2.3 지능형 양방향 질의 (`/query`)
사용자가 터미널을 통해 질문하면, 선택된 AI 소스(Grok, Ollama 등)로 전달하고 응답을 아바타가 자동으로 읽어줍니다.

- **Method**: `POST`
- **Request Body**:
| 필드명 | 타입 | 필수 | 설명 |
| :--- | :--- | :--- | :--- |
| `prompt` | String | O | AI에게 보낼 질문 내용 |

**동작 원리**:
1. 헤더의 API Key로 전송 소스(Source) 판별
2. `api.json`의 해당 소스 설정(Ollama 또는 OpenAI 규격)에 따라 질의 수행
3. AI 응답 수신 시 자동으로 `speak` 이벤트를 생성하여 아바타 큐에 삽입
4. 터미널 및 아바타가 동시에 응답 처리

---

## 3. 서비스 구성 및 설정

### 3.1 AI 허브 설정 (`config/api.json`)
각 AI 엔진의 API 타입, 모델명, Base URL, 시뮬레이션(`mock`) 여부를 관리합니다.
- `api_type`: `ollama` 또는 `openai` (Grok, ChatGPT 등 호환 모델)
- `mock`: `true`로 설정 시 실제 API 호출 없이 시뮬레이션 응답 반환

### 3.2 비밀 키 관리 (`config/secrets.json`)
- `EXTERNAL_API_KEYS`: 터미널 위젯과 서버 간의 인터페이스 인증용 키
- `AI_PROVIDER_KEYS`: 외부 AI 서비스(OpenAI, xAI 등)의 실제 API Key

---

## 4. 보안 가이드라인
1. **API Key 분리**: 인터페이스용 키와 실제 서비스 키를 분리 관리하여 보안을 강화합니다.
2. **Timeout**: 외부 AI 응답 지연에 대비하여 60초의 타임아웃을 적용합니다.
3. **CORS**: 허용된 대시보드 도메인에서만 접근 가능하도록 설정합니다.

---
*최종 업데이트: 2026-02-27 (Multi-AI Integration Milestone)*
