"""
AEGIS Plugin-X Backend Registry (v1.0)
Allows plugins to register backend capabilities (context data providers, etc.)
"""

_context_providers = {}


def register_context_provider(plugin_id, provider_func):
    """
    플러그인에서 데이터 수집 로직(Context Provider)을 등록합니다.
    DataService는 이들을 순회하며 데이터를 수집합니다.
    """
    _context_providers[plugin_id] = provider_func
    print(f"[PluginRegistry] Context provider registered for: {plugin_id}")


def get_plugin_context_data():
    """
    등록된 모든 플러그인 데이터를 수집합니다.
    """
    all_data = {}
    for plugin_id, provider in _context_providers.items():
        try:
            # provider는 인자 없이 호출되며 딕셔너리 또는 리스트를 반환해야 함
            all_data[plugin_id] = provider()
        except Exception as e:
            print(f"[PluginRegistry] Error in context provider of '{plugin_id}': {e}")
    return all_data
