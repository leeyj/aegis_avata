import os
import json
import secrets
from flask import request, abort
from functools import wraps
from routes.config import PLUGINS_DIR

_manifest_cache = {}


def load_plugin_manifest(plugin_id):
    """플러그인 manifest.json 로드 (캐싱 적용)"""
    if plugin_id in _manifest_cache:
        return _manifest_cache[plugin_id]

    manifest_path = os.path.join(PLUGINS_DIR, plugin_id, "manifest.json")
    if not os.path.exists(manifest_path):
        return None

    try:
        with open(manifest_path, "r", encoding="utf-8-sig") as f:
            manifest = json.load(f)
            _manifest_cache[plugin_id] = manifest
            return manifest
    except Exception:
        return None


def get_plugin_id_from_request():
    """요청 URL에서 플러그인 ID 추출 (/api/plugins/[id]/...)"""
    parts = request.path.split("/")
    if len(parts) >= 4 and parts[1] == "api" and parts[2] == "plugins":
        return parts[3]
    return None


def check_plugin_permission(permission_id):
    """현재 요청을 보낸 플러그인에 특정 권한이 있는지 명시적으로 확인"""
    plugin_id = get_plugin_id_from_request()
    if not plugin_id:
        return True  # 코어 호출은 무조건 허용

    manifest = load_plugin_manifest(plugin_id)
    if not manifest:
        return False

    permissions = manifest.get("permissions", [])
    if permission_id not in permissions:
        print(
            f"[Security] Permission Denied: Plugin '{plugin_id}' requires '{permission_id}'"
        )
        return False

    return True


def require_permission(permission_id):
    """
    플러그인 권한 확인 데코레이터.
    해당 플러그인의 manifest.json에 해당 권한이 선언되어 있어야 합니다.
    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not check_plugin_permission(permission_id):
                abort(
                    403,
                    description=f"Permission '{permission_id}' is required for this call.",
                )

            return f(*args, **kwargs)

        return decorated_function

    return decorator


# [v4.0] Proxy Token Registry (Phase 4)
_PROXY_TOKENS = {}  # plugin_id -> token


def get_proxy_token(plugin_id):
    """플러그인별 고유 프록시 토큰 발급/조회"""
    if plugin_id not in _PROXY_TOKENS:
        _PROXY_TOKENS[plugin_id] = secrets.token_hex(16)
    return _PROXY_TOKENS[plugin_id]


def verify_proxy_token(plugin_id, token):
    """전달된 토큰이 해당 플러그인의 공식 토큰인지 검증"""
    return _PROXY_TOKENS.get(plugin_id) == token
