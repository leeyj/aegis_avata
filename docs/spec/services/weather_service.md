# WeatherService 모듈 기능 명세서

`services/weather_service.py`는 OpenWeatherMap API를 사용하여 실시간 날씨 정보를 가져오고, 이를 AEGIS 시스템의 날씨 상태(SUNNY, RAINY, CLOUDY 등)로 변환하는 역할을 합니다.

---

## 🏗️ 주요 기능 (Functions)

### 1. `get_real_weather(api_key, city)`
*   **기능**: 지정된 도시의 현재 날씨와 기온 데이터를 가져와 시스템 표준 포맷으로 변환합니다.
*   **입력**: OpenWeatherMap API Key, 도시 이름 (예: "Seoul").
*   **출력**: 날씨 상태 정보 객체.
    ```json
    {
      "status": "RAINY",
      "temp": "18.5°C",
      "city": "Seoul",
      "icon": "10d",
      "condition_raw": "Rain"
    }
    ```

---

## ⛅ 날씨 상태 변환 (Mapping)
API에서 받아온 날씨 상태(`condition_raw`)를 기반으로 대시보드 및 아바타 반응에서 사용할 4가지 표준 상태로 매핑합니다.
*   **SUNNY**: 맑음 (Clear)
*   **RAINY**: 비 또는 이슬비 (Rain, Drizzle)
*   **STORM**: 뇌우 (Thunderstorm)
*   **CLOUDY**: 구름 (Clouds)
*   **UNKNOWN**: 그 외 상태
