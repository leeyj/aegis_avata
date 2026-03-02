import requests


def get_real_weather(api_key, city):
    """OpenWeatherMap API를 사용하여 실제 날씨 정보 획득"""
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
    try:
        response = requests.get(url, timeout=5)
        data = response.json()
        if response.status_code == 200:
            temp = data["main"]["temp"]
            condition = data["weather"][0]["main"].upper()

            status = "SUNNY"
            if "RAIN" in condition or "DRIZZLE" in condition:
                status = "RAINY"
            elif "CLOUD" in condition:
                status = "CLOUDY"
            elif "THUNDER" in condition:
                status = "STORM"
            elif "CLEAR" in condition:
                status = "SUNNY"

            return {
                "status": status,
                "temp": f"{temp:.1f}°C",
                "city": city,
                "icon": data["weather"][0]["icon"],
                "condition_raw": condition,
            }
        else:
            return {"status": "UNKNOWN", "error": data.get("message", "Error")}
    except Exception as e:
        print(f"Weather Fetch Error: {e}")
        return {"status": "ERROR"}
