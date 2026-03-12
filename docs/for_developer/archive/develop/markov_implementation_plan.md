# 구현 계획서 (Implementation Plan): [markov] 아무말 대잔치 플러그인

## 1. 개요 (Overview)
- **ID**: `markov`
- **목적**: 사용자와의 가벼운 교감(Funny)을 위해, AI API 비용 발생 없이 클라이언트단에서 무작위 문장을 생성하여 아바타가 말하게 함.
- **트리거**: 아바타(Live2D 캔버스)를 마우스로 3회 연속 클릭(Poke).

## 2. 기술 사양 (Technical Specifications)
- **비용**: 0원 (로컬 자바스크립트 로직만 사용).
- **알고리즘**: Bi-gram 기반의 마르코프 체인 (Markov Chain).
    - 준비된 코퍼스(Corpus)의 단어 간 인접 확률을 계산하여 익숙하면서도 엉뚱한 문장 생성.
- **코퍼스(Corpus)**: 2024~2025 최신 밈, 개그콘서트 '아무말 대잔치', 개발자 유머 등 약 100여 개의 문장.
- **UI/UX**:
    - `window` 레벨의 `mousedown` 이벤트를 캡처하여 target이 `#live2d-canvas`인지 확인.
    - 600ms 이내의 연속 클릭을 카운트하여 3회 달성 시 작동.
    - 아바타 모션(`TapBody` 등)과 `context.speak()` 연동.

## 3. 구현 단계 (Execution Steps)
1. `plugins/markov/manifest.json` 생성 (id, entry, priority 설정).
2. `plugins/markov/assets/widget.js` 작성.
    - 코퍼스 데이터 삽입.
    - 단어 분절 및 체인(Map) 생성 로직 구현.
    - 랜덤 문장 생성기 함수 구현.
    - 캔버스 클릭 감지 및 연속 클릭 카운터 로직 구현.
3. `context.speak` 및 `window.ModelController` 연동 테스트.
4. 배포 전 서버 인메모리 캐시 갱신을 위한 프로세스 재시작.

## 4. 기대 효과
- 사용자가 심심할 때 아바타를 찌르는 물리적 피드백 제공.
- AI 토큰 소모 없이 '살아있는 듯한' 아바타 느낌 연출.
