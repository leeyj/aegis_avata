"""
AEGIS Plugin-X Backend Registry (v1.0)
Allows plugins to register backend capabilities (context data providers, etc.)
"""

# 전역 레지스트리
_context_providers = {}
_ai_processors = {}
_context_aliases = {}


def _sanitize_data(data, max_depth=5, current_depth=0):
    """
    플러그인 반환 데이터의 위생 처리:
    - JSON 직렬화 가능 여부 확인
    - 순환 참조 방지 및 깊이 제한
    - 너무 큰 데이터(문자열/리스트) 생략 시도
    """
    import json

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


def register_context_provider(
    plugin_id, provider_func, ai_processor=None, aliases=None
):
    """
    플러그인 데이터 공급자 등록.
    ai_processor: (선택) AI에게 제공할 때 데이터를 정제할 전용 함수
    """
    _context_providers[plugin_id] = provider_func
    if ai_processor:
        _ai_processors[plugin_id] = ai_processor

    _context_aliases[plugin_id] = plugin_id
    if aliases:
        for alias in aliases:
            _context_aliases[alias] = plugin_id

    print(f"[PluginRegistry] Registered: {plugin_id}")


def get_plugin_context_data(plugin_ids=None, for_ai=True, timeout=5):
    """
    플러그인 데이터 병렬 수집. for_ai=True 이면 AI 전용 프로세서가 있을 경우 이를 사용함.
    """
    from concurrent.futures import ThreadPoolExecutor

    all_data = {}
    target_items = []

    pids = plugin_ids if plugin_ids else list(_context_providers.keys())

    for pid in pids:
        if pid in _context_providers:
            # AI용 요청이고 별도 전용 프로세서가 있다면 그것을 우선 사용
            func = (
                _ai_processors.get(pid)
                if (for_ai and pid in _ai_processors)
                else _context_providers[pid]
            )
            target_items.append((pid, func))

    if not target_items:
        return {}

    with ThreadPoolExecutor(max_workers=len(target_items)) as executor:
        future_to_id = {executor.submit(func): pid for pid, func in target_items}

        for future, pid in future_to_id.items():
            try:
                raw_result = future.result(timeout=timeout)
                all_data[pid] = _sanitize_data(raw_result)
            except Exception as e:
                print(f"[PluginRegistry] Timeout or Error in '{pid}': {e}")
                all_data[pid] = {"status": "error", "message": str(e)}

    return all_data


def get_context_aliases():
    return _context_aliases


def get_unified_help_markdown():
    """웹 HUD와 디스코드 봇에서 공통으로 사용할 통합 도움말 생성"""
    aliases_map = get_context_aliases()
    provider_aliases = {}
    for alias, plugin in aliases_map.items():
        if plugin not in provider_aliases:
            provider_aliases[plugin] = []
        if alias not in provider_aliases[plugin]:
            provider_aliases[plugin].append(alias)

    aliases_text = "\n".join(
        [
            f"- **{plugin}**: `{'`, `'.join(aliases)}`"
            for plugin, aliases in provider_aliases.items()
        ]
    )

    help_md = f"""### 🛰️ AEGIS Tactical Interface Help

**1. 💬 지능형 AI 대화 (@별명)**
- `@별명`과 함께 질문하면 해당 위젯의 실시간 데이터를 가져옵니다.
- **현재 등록된 인지 가능 별명:**
{aliases_text}
- 예: `@뉴스 주요 소식 요약`, `@날씨 나들이 가기 좋아?`

**2. 🌐 확정적 웹 검색 (#)**
- 명령어 앞에 `#`을 붙이면 AI의 환각 없이 **구글 검색**을 100% 강제합니다.
- 예: `#테슬라 주가`, `#오늘의 운세`

**3. ⚡ 플러그인 및 시스템 제어 (/)**
- `/명령어` 형태로 시스템 기능을 직접 실행합니다.
- 예: `/보고` (시스템 분석 리포트), `/뉴스` (RSS 요약)

**4. 🔇 음소거 모드 (--m, --mute)**
- 명령어 뒤에 `--m`을 붙이면 음성 브리핑을 생략합니다.
- 예: `오늘 뉴스 요약해줘 --m`

*(모든 입력은 데스크탑 HUD 아바타의 반응을 실시간으로 트리거합니다)*
"""
    return help_md
