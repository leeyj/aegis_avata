# 🎭 Reaction Engine (아바타 자동 반응) 가이드 v1.9

AEGIS 아바타는 실시간 데이터를 분석하여 특정 조건이 충족될 때 자동으로 반응합니다. 이 로직은 `config/reactions.json`에서 제어됩니다.

---

## 1. 동작 원리
1. 시스템이 일정 주기마다 날씨, 금융 데이터를 스캔합니다.
2. 각 데이터의 수치(상태)를 `reactions.json`에 정의된 `condition`과 비교합니다.
3. 조건이 충족되면 정의된 `actions` 세트를 실행 큐에 삽입합니다.

---

## 2. 데이터 도메인 및 조건

### 2.1 주식/금융 (`stock`)
- **수집 데이터**: `change_pct` (변동률), `name` (종목명), `price` (현재가).
- **예시 조건**: 
  - `change_pct >= 3`: 주가 급등 시 발동.
  - `change_pct <= -3`: 주가 급락 시 발동.

### 2.2 날씨 (`weather`)
- **수집 데이터**: `status` (날씨 상태 - RAINY, SNOWY, SUNNY 등).
- **예시 조건**:
  - `['RAINY', 'STORM'].includes(status)`: 비가 올 때 발동.

---

## 3. 실행 액션 (Actions)

반응 시 아바타가 수행할 행동들을 리스트 형태로 정의합니다.

- **MOTION**: 특정 애니메이션 파일(.motion3.json) 또는 에일리어스 재생.
- **EMOTION**: 특정 표정 파일(.exp3.json) 또는 에일리어스 적용.
- **WEATHER_EFFECT**: 비, 눈, 번개 등 화면 전역 환경 효과 트리거. (`v1.9` 신규)
- **TTS**: 아바타가 읽을 대사 출력. (중괄호 `{}` 내 변수 지원)
- **EVENT**: 시스템 정의 특수 이벤트 실행.

---

## 4. 커스터마이징 예시

```json
"stock": {
    "super_rise": {
        "condition": "change_pct >= 10",
        "actions": [
            { "type": "MOTION", "alias": "joy" },
            { "type": "TTS", "template": "{name} 이 미쳤어요! 무려 {change_pct}% 폭등 중입니다!" }
        ]
    }
}
```

*최종 업데이트: 2026-02-27*
