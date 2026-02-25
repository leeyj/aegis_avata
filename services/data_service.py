from utils import load_json_config
from services import google_calendar, weather_service, finance_service, news_service


class DataService:
    """
    브리핑에 필요한 날씨, 금융, 일정, 이메일 등의 데이터를 총괄 수집하는 서비스
    """

    def __init__(self, config_paths):
        self.config_paths = config_paths

    def collect_all_context(self):
        """
        모든 외부 API 데이터를 수집하여 딕셔너리로 반환
        """
        context = {"weather": None, "finance": None, "calendar": [], "emails": []}

        # 1. 날씨 데이터 수집
        w_path = self.config_paths.get("weather")
        if w_path:
            w_conf = load_json_config(w_path)
            if w_conf:
                context["weather"] = weather_service.get_real_weather(
                    w_conf.get("api_key"), w_conf.get("city", "Seoul")
                )

        # 2. 금융 데이터 수집
        f_path = self.config_paths.get("finance")
        if f_path:
            f_conf = load_json_config(f_path)
            if f_conf:
                context["finance"] = finance_service.get_market_indices(
                    f_conf.get("tickers", {})
                )

        # 3. 뉴스 데이터 수집 (요약용 상위 5개)
        n_path = self.config_paths.get("news")
        if n_path:
            n_conf = load_json_config(n_path)
            if n_conf:
                # 쿼타 절약을 위해 요약용으로는 5개만 전달
                context["news"] = news_service.get_news_rss(
                    n_conf.get("rss_urls", {}), max_items=5
                )

        # 4. 구글 일정 및 이메일 수집
        try:
            context["calendar"] = google_calendar.get_today_events()
            context["emails"] = google_calendar.get_recent_emails()
        except Exception as e:
            print(f"[DataService] Google Service Error: {e}")

        return context
