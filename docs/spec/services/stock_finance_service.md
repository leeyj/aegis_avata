# StockService & FinanceService 모듈 기능 명세서

`services/stock_service.py`와 `services/finance_service.py`는 `yfinance` 라이브러리를 통해 국내외 주식 및 전 세계 시장 지수 데이터를 실시간으로 수집합니다.

---

## 📈 StockService

### 1. `get_stock_data(tickers)`
*   **기능**: 사용자의 관심 종목(Name: Symbol) 목록에 대해 현재 주가와 전일 대비 변동폭을 가져옵니다.
*   **입력**: 티커 딕셔너리 (예: `{"SAMSUNG": "005930.KS", "APPLE": "AAPL"}`)
*   **출력**: 종목별 주가 정보 딕셔너리.
    ```json
    {
      "SAMSUNG": {
        "symbol": "005930.KS",
        "price": "72,400.00",
        "change": "+1,200.00",
        "change_pct": 1.68,
        "direction": "up"
      }
    }
    ```

---

## 📊 FinanceService

### 1. `get_market_indices(tickers)`
*   **기능**: KOSPI, S&P 500, NASDAQ 등 주요 경제 지표 데이터를 가져옵니다.
*   **내부 로직**: `yf.Ticker().fast_info`를 사용하여 API 호출 오버헤드를 줄이고 실시간성을 높입니다.

### 2. `get_demo_trading_data()`
*   **기능**: 실시간 데이터 외에 시스템의 활성화를 보여주기 위한 가상의 트레이딩 수익률 데이터를 생성합니다. (UI 컴포넌트용)
