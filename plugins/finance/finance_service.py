import yfinance as yf
import random


def get_market_indices(tickers):
    """yfinance를 사용하여 시장 지수 정보 획득"""
    results = {}
    for name, symbol in tickers.items():
        try:
            ticker = yf.Ticker(symbol)
            fast_info = ticker.fast_info
            current_price = float(fast_info.last_price)
            prev_price = float(fast_info.previous_close)

            if current_price and prev_price:
                change = current_price - prev_price
                change_pct = (change / prev_price) * 100

                results[name] = {
                    "price": f"{current_price:,.2f}",
                    "change": f"{change:+.2f}",
                    "change_pct": f"{change_pct:+.2f}%",
                    "change_pct_raw": round(change_pct, 2),
                    "direction": "up" if change >= 0 else "down",
                }
                print(
                    f"[FinanceService] {name}({symbol}) fetched: {results[name]['price']} ({results[name]['change_pct']})"
                )
        except Exception as e:
            print(f"[FinanceService] Error fetching {name}({symbol}): {e}")
            continue
    return results
