import feedparser
import time
import re


def clean_html(text):
    """HTML 태그 제거 및 공백 정리"""
    if not text:
        return ""
    clean = re.compile("<.*?>")
    return re.sub(clean, "", text).strip()


def get_news_rss(rss_dict, max_items=10):
    """RSS 피드로부터 최신 뉴스 수집 (태그 제거 및 정렬 개선)"""
    try:
        all_news = []
        for provider, url in rss_dict.items():
            feed = feedparser.parse(url)
            entries = list(feed.entries)

            for entry in entries[0:max_items]:
                pub_ts = 0
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    pub_ts = time.mktime(entry.published_parsed)
                elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                    pub_ts = time.mktime(entry.updated_parsed)

                title = clean_html(getattr(entry, "title", "No Title"))
                summary = clean_html(getattr(entry, "summary", ""))

                all_news.append(
                    {
                        "provider": provider,
                        "title": title,
                        "summary": summary,
                        "link": getattr(entry, "link", "#"),
                        "published": getattr(entry, "published", ""),
                        "timestamp": pub_ts,
                    }
                )

        # 최신순 정렬 후 최종 max_items 반환
        all_news.sort(key=lambda x: x["timestamp"], reverse=True)
        return all_news[0:max_items]
    except Exception as e:
        print(f"RSS Fetch Error: {e}")
        return []
