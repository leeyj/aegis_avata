import yfinance as yf
import json
import os


def get_stock_data(tickers):
    """
    지정된 티커 목록에 대한 실시간 주가 정보를 가져옴
    """
    results = {}
    for name, symbol in tickers.items():
        try:
            ticker = yf.Ticker(symbol)
            # 실시간/전일 종가 시차 문제를 해결하기 위해 fast_info 사용
            fast_info = ticker.fast_info
            current_price = float(fast_info.last_price)
            prev_price = float(fast_info.previous_close)

            if current_price and prev_price:
                change = current_price - prev_price
                change_pct = (change / prev_price) * 100

                results[name] = {
                    "symbol": symbol,
                    "price": f"{current_price:,.2f}",
                    "change": f"{change:+.2f}",
                    "change_pct": round(change_pct, 2),
                    "direction": "up" if change >= 0 else "down",
                }
                print(
                    f"[StockService] {name}({symbol}) fetched: {results[name]['price']} ({results[name]['change_pct']}%)"
                )
        except Exception as e:
            print(f"[StockService] Error fetching {name}({symbol}): {e}")
            continue
    return results
