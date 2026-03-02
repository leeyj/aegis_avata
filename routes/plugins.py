import os
import json
import sys
from flask import Blueprint, jsonify, send_from_directory
from routes.decorators import login_required
from routes.config import PLUGINS_DIR

plugins_bp = Blueprint("plugins", __name__)


@plugins_bp.route("/api/plugins/active")
@login_required
def get_active_plugins():
    """AEGIS Plugin-X: 활성화된 모든 플러그인 목록을 반환"""
    active_plugins = []
    if not os.path.exists(PLUGINS_DIR):
        os.makedirs(PLUGINS_DIR, exist_ok=True)
        return jsonify([])

    for plugin_id in os.listdir(PLUGINS_DIR):
        plugin_path = os.path.join(PLUGINS_DIR, plugin_id)
        if os.path.isdir(plugin_path):
            manifest_path = os.path.join(plugin_path, "manifest.json")
            if os.path.exists(manifest_path):
                try:
                    with open(manifest_path, "r", encoding="utf-8-sig") as f:
                        manifest = json.load(f)
                        manifest["id"] = plugin_id
                        if "entry" in manifest:
                            for key in ["html", "js", "css"]:
                                if key in manifest["entry"]:
                                    file_path = manifest["entry"][key]
                                    manifest["entry"][key] = (
                                        f"/api/plugins/assets/{plugin_id}/{file_path}"
                                    )
                        active_plugins.append(manifest)
                except Exception as e:
                    print(f"[Plugin-X] Error loading manifest for {plugin_id}: {e}")
    return jsonify(active_plugins)


@plugins_bp.route("/api/plugins/assets/<plugin_id>/<path:filename>")
@login_required
def get_plugin_asset(plugin_id, filename):
    """플러그인 자산 전용 서빙 라우트"""
    plugin_path = os.path.join(PLUGINS_DIR, plugin_id)
    if not os.path.exists(plugin_path):
        return jsonify({"status": "error", "message": "Plugin not found"}), 404

    mimetype = None
    if filename.endswith(".js"):
        mimetype = "application/javascript"
    elif filename.endswith(".css"):
        mimetype = "text/css"
    return send_from_directory(plugin_path, filename, mimetype=mimetype)


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
                    if os.path.exists(backend_path):
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
                                spec.loader.exec_module(module)

                                # Blueprint 탐색
                                found_bp_count = 0
                                for attr_name in dir(module):
                                    attr = getattr(module, attr_name)
                                    # Blueprint 객체이거나 'Blueprint' 클래스명인 경우 (Duck Typing)
                                    # [CRITICAL] isinstance 체크를 먼저 해야 LocalProxy(request 등)의 context 에러를 방지함
                                    is_bp = (
                                        isinstance(attr, Blueprint)
                                        or type(attr).__name__ == "Blueprint"
                                    )
                                    if is_bp and hasattr(attr, "name"):
                                        blueprints.append(attr)
                                        found_bp_count += 1
                                        print(
                                            f"[Plugin-X] Backend loaded (Blueprint): {plugin_id} -> {attr.name}"
                                        )

                                if found_bp_count == 0:
                                    print(
                                        f"[Plugin-X] WARNING: No Blueprint found in {backend_path}"
                                    )

                        except Exception as e:
                            print(f"[Plugin-X] ERROR loading {plugin_id}: {e}")
                            import traceback

                            traceback.print_exc()

        except Exception as e:
            print(f"[Plugin-X] Manifest error for {plugin_id}: {e}")

    print(f"[Plugin-X] Total {len(blueprints)} blueprints discovered.")
    return blueprints
