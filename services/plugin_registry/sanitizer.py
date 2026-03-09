import json


def _sanitize_data(data, max_depth=5, current_depth=0):
    """
    플러그인 반환 데이터의 위생 처리:
    - JSON 직렬화 가능 여부 확인
    - 순환 참조 방지 및 깊이 제한
    - 너무 큰 데이터(문자열/리스트) 생략 시도
    """
    if current_depth > max_depth:
        return "<Depth Limit Exceeded>"

    if isinstance(data, (str, int, float, bool, type(None))):
        if isinstance(data, str) and len(data) > 10000:
            return str(data[:10000]) + "... (Truncated)"
        return data

    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            if k.lower() in ["api_key", "password", "token", "secret"]:
                new_dict[k] = "***MASKED***"
            else:
                new_dict[str(k)] = _sanitize_data(v, max_depth, current_depth + 1)
        return new_dict

    if isinstance(data, (list, tuple, set)):
        items = list(data)
        if len(items) > 200:
            items = [items[i] for i in range(200)]
        return [_sanitize_data(item, max_depth, current_depth + 1) for item in items]

    # 직렬화 불가능한 객체는 문자열로 변환 시도
    try:
        json.dumps(data)
        return data
    except Exception:
        return str(data)
