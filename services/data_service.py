from services.plugin_registry import get_plugin_context_data


class DataService:
    """
    브리핑에 필요한 데이터를 총괄 수집하는 서비스 (Plugin-X 기반)
    """

    def __init__(self, config_paths=None):
        # config_paths는 레거시 호환을 위해 유지하지만 더 이상 주력으로 사용하지 않음
        self.config_paths = config_paths or {}

    def collect_all_context(self):
        """
        [Plugin-X] 모든 등록된 플러그인의 데이터를 수집 (Pure Dynamic)
        """
        # 1. 동적 플러그인 데이터 통합 (Plugin-X Registry)
        context = get_plugin_context_data()
        return context
