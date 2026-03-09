import os
import json
import sys
from flask import Blueprint, jsonify, send_from_directory
from routes.decorators import login_required
from routes.config import PLUGINS_DIR
from services.plugin_registry import get_context_aliases

plugins_bp = Blueprint("plugins", __name__)


# [v2.3.0] AEGIS Extreme Cache (AXC) - Server side
# json: serialized JSON string
# hash: SHA256 or unique token for versioning
_PLUGIN_PACK_CACHE = {"json": None, "raw": None, "hash": None}


@plugins_bp.route("/api/plugins/active")
@login_required
def get_active_plugins():
    init_pack = get_plugin_init_pack_data()
    return jsonify(init_pack["plugins"])


@plugins_bp.route("/api/plugins/aliases")
@login_required
def get_all_aliases():
    """Plugin-X 레지스트리에 등록된 모든 알리아스 매핑 반환"""
    from services.plugin_registry import get_context_aliases

    return jsonify(get_context_aliases())


@plugins_bp.route("/api/plugins/assets/<plugin_id>/<path:filename>")
@login_required
def get_plugin_asset(plugin_id, filename):
    """플러그인 자산 전용 서빙 라우트 (폴백용)"""
    plugin_path = os.path.join(PLUGINS_DIR, plugin_id)
    if not os.path.exists(plugin_path):
        return jsonify({"status": "error", "message": "Plugin not found"}), 404

    mimetype = None
    if filename.endswith(".js"):
        mimetype = "application/javascript"
    elif filename.endswith(".css"):
        mimetype = "text/css"
    return send_from_directory(plugin_path, filename, mimetype=mimetype)


def get_plugin_init_pack_data(rebuild=False):
    """인메모리 캐시를 포함한 통합 패킷 데이터 생성"""
    global _PLUGIN_PACK_CACHE
    if not rebuild and _PLUGIN_PACK_CACHE["raw"]:
        # raw data only for internal use if needed
        return _PLUGIN_PACK_CACHE["raw"]

    print("[InitPack] Cache miss or rebuild. Generating Super Bundle...")
    pack = {"plugins": [], "bundle": {}}
    if not os.path.exists(PLUGINS_DIR):
        return pack

    for plugin_id in sorted(os.listdir(PLUGINS_DIR)):
        plugin_path = os.path.join(PLUGINS_DIR, plugin_id)
        if not os.path.isdir(plugin_path):
            continue

        manifest_path = os.path.join(plugin_path, "manifest.json")
        if os.path.exists(manifest_path):
            try:
                with open(manifest_path, "r", encoding="utf-8-sig") as f:
                    manifest = json.load(f)
                    manifest["id"] = plugin_id
                    entry = manifest.get("entry", {})
                    for key in ["html", "js", "css"]:
                        if key in entry:
                            file_name = entry[key]
                            # 폴백용 URL 유지
                            manifest["entry"][key] = (
                                f"/api/plugins/assets/{plugin_id}/{file_name}"
                            )

                            # 번들링 (파일 내용 수집)
                            file_path = os.path.join(plugin_path, file_name)
                            if os.path.exists(file_path):
                                if plugin_id not in pack["bundle"]:
                                    pack["bundle"][plugin_id] = {}
                                with open(file_path, "r", encoding="utf-8") as af:
                                    pack["bundle"][plugin_id][key] = af.read()

                    # [v3.7.2] 지원 체계 탐색 (시각화용)
                    has_commands = any(
                        a.get("commands") for a in manifest.get("actions", [])
                    )
                    has_ai_prompt = os.path.exists(
                        os.path.join(plugin_path, "ai_prompt.md")
                    )

                    manifest["support_systematic"] = has_commands
                    manifest["support_hybrid"] = has_ai_prompt

                    pack["plugins"].append(manifest)
            except Exception as e:
                print(f"[InitPack] Error processing {plugin_id}: {e}")

    # 리스트 정렬
    pack["plugins"].sort(key=lambda p: p.get("priority", 100))

    # [v2.3.0] 해시 생성 및 캐시 저장
    import hashlib

    json_str = json.dumps(pack)
    bundle_hash = hashlib.sha256(json_str.encode("utf-8")).hexdigest()

    _PLUGIN_PACK_CACHE["raw"] = pack
    _PLUGIN_PACK_CACHE["json"] = json_str
    _PLUGIN_PACK_CACHE["hash"] = bundle_hash
    return pack


@plugins_bp.route("/api/plugins/init_pack")
@login_required
def get_plugin_init_pack():
    """[v2.3.0] Super Bundle: Pre-serialized JSON 응답으로 오버헤드 최소화"""
    global _PLUGIN_PACK_CACHE
    from flask import Response

    if not _PLUGIN_PACK_CACHE["json"]:
        get_plugin_init_pack_data(rebuild=True)

    print(f"[InitPack] Serving Super Bundle (Hash: {_PLUGIN_PACK_CACHE['hash'][:8]})")
    return Response(_PLUGIN_PACK_CACHE["json"], mimetype="application/json")


@plugins_bp.route("/api/plugins/version")
@login_required
def get_plugin_version():
    """[v2.3.0] 현재 플러그인 팩의 해시 버전만 반환 (클라이언트 캐시 검증용)"""
    global _PLUGIN_PACK_CACHE
    if not _PLUGIN_PACK_CACHE["hash"]:
        get_plugin_init_pack_data(rebuild=True)
    return jsonify({"version": _PLUGIN_PACK_CACHE["hash"]})


def get_all_plugin_csp_domains():
    """모든 플러그인의 CSP 도메인 통합 수집"""
    merged_domains = {
        "img-src": set(),
        "script-src": set(),
        "connect-src": set(),
        "frame-src": set(),
    }
    if not os.path.exists(PLUGINS_DIR):
        return merged_domains

    for plugin_id in os.listdir(PLUGINS_DIR):
        plugin_path = os.path.join(PLUGINS_DIR, plugin_id)
        if os.path.isdir(plugin_path):
            manifest_path = os.path.join(plugin_path, "manifest.json")
            if os.path.exists(manifest_path):
                try:
                    with open(manifest_path, "r", encoding="utf-8-sig") as f:
                        manifest = json.load(f)
                        csp = manifest.get("csp_domains", {})
                        for directive, domains in csp.items():
                            if directive in merged_domains and isinstance(
                                domains, list
                            ):
                                for d in domains:
                                    merged_domains[directive].add(d)
                except Exception:
                    continue
    return {k: sorted(list(v)) for k, v in merged_domains.items()}


def discover_plugin_blueprints():
    """AEGIS Plugin-X: 각 플러그인 폴더에서 backend_entry로 지정된 Blueprint 자동 수집"""
    blueprints = []
    if not os.path.exists(PLUGINS_DIR):
        return blueprints

    for plugin_id in os.listdir(PLUGINS_DIR):
        plugin_path = os.path.join(PLUGINS_DIR, plugin_id)
        if not os.path.isdir(plugin_path):
            continue

        # 1. manifest.json 체크
        manifest_path = os.path.join(plugin_path, "manifest.json")
        if not os.path.exists(manifest_path):
            continue

        try:
            with open(manifest_path, "r", encoding="utf-8-sig") as f:
                manifest = json.load(f)
                backend_file = manifest.get("entry", {}).get("backend")

                if backend_file:
                    backend_path = os.path.join(plugin_path, backend_file)
                    if not os.path.exists(backend_path):
                        print(
                            f"[Plugin-X] ERROR: Backend file not found: {backend_path}"
                        )
                        continue

                    # [Plugin-X] 명확한 고유 모듈명 생성 (dashes -> underscores)
                    module_name = f"plugins_{plugin_id.replace('-', '_')}_router"

                    try:
                        import importlib.util

                        spec = importlib.util.spec_from_file_location(
                            module_name, backend_path
                        )
                        if spec and spec.loader:
                            module = importlib.util.module_from_spec(spec)

                            # 패키지 정보 주입 (상대 경로 임포트 지원용)
                            module.__package__ = f"plugins.{plugin_id}"

                            # sys.modules 등록 (상대 경로 임포트 시 패키지 검색 가능하게 함)
                            sys.modules[module_name] = module

                            # 실행
                            print(f"[Plugin-X] Loading plugin: {plugin_id} ...")
                            spec.loader.exec_module(module)

                            # Blueprint 탐색
                            found_bp_count = 0
                            for attr_name in dir(module):
                                # [v2.3.1] LocalProxy 접근으로 인한 RuntimeContext 에러 방지
                                # request와 같은 LocalProxy 객체에 getattr 수행 시 런타임 에러 발생 가능
                                try:
                                    attr = getattr(module, attr_name)
                                except Exception:
                                    continue

                                # Blueprint 객체이거나 'Blueprint' 클래스명인 경우 (Duck Typing)
                                is_bp = (
                                    isinstance(attr, Blueprint)
                                    or type(attr).__name__ == "Blueprint"
                                )
                                if is_bp and hasattr(attr, "name"):
                                    blueprints.append(attr)
                                    found_bp_count += 1
                                    print(
                                        f"[Plugin-X] SUCCESS: Backend loaded (Blueprint): {plugin_id} -> {attr.name}"
                                    )

                            if found_bp_count == 0:
                                print(
                                    f"[Plugin-X] WARNING: No Blueprint found in {backend_path}"
                                )

                    except Exception as e:
                        print(f"[Plugin-X] CRITICAL ERROR loading {plugin_id}: {e}")
                        import traceback

                        traceback.print_exc()

        except Exception as e:
            print(f"[Plugin-X] Manifest error for {plugin_id}: {e}")

    print(
        f"[Plugin-X] Discovery complete. Total {len(blueprints)} blueprints discovered."
    )
    return blueprints
