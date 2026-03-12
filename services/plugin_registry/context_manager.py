from services.plugin_registry.globals import (
    _context_providers,
    _ai_processors,
    _context_aliases,
)
from services.plugin_registry.sanitizer import _sanitize_data


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
