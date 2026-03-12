import os
import json
import sys
from flask import Blueprint
from routes.config import PLUGINS_DIR

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

    print(f"[Plugin-X] Starting discovery in {PLUGINS_DIR}...")
    for plugin_id in os.listdir(PLUGINS_DIR):
        plugin_path = os.path.join(PLUGINS_DIR, plugin_id)
        if not os.path.isdir(plugin_path):
            continue

        # [v4.0] 상세 로깅 추가
        with open("web_debug.log", "a", encoding="utf-8") as log_f:
            log_f.write(f"[Plugin-X] Scanning: {plugin_id}\n")

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
                        msg = (
                            f"[Plugin-X] ERROR: Backend file not found: {backend_path}"
                        )
                        print(msg)
                        with open("web_debug.log", "a", encoding="utf-8") as log_f:
                            log_f.write(msg + "\n")
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
                                    msg = f"[Plugin-X] SUCCESS: Backend loaded (Blueprint): {plugin_id} -> {attr.name}"
                                    print(msg)
                                    with open(
                                        "web_debug.log", "a", encoding="utf-8"
                                    ) as log_f:
                                        log_f.write(msg + "\n")

                            if found_bp_count == 0:
                                msg = f"[Plugin-X] WARNING: No Blueprint found in {backend_path}"
                                print(msg)
                                with open(
                                    "web_debug.log", "a", encoding="utf-8"
                                ) as log_f:
                                    log_f.write(msg + "\n")

                    except Exception as e:
                        msg = f"[Plugin-X] CRITICAL ERROR loading {plugin_id}: {e}"
                        print(msg)
                        with open("web_debug.log", "a", encoding="utf-8") as log_f:
                            log_f.write(msg + "\n")
                        import traceback

                        traceback.print_exc()

        except Exception as e:
            msg = f"[Plugin-X] Manifest error for {plugin_id}: {e}"
            print(msg)
            with open("web_debug.log", "a", encoding="utf-8") as log_f:
                log_f.write(msg + "\n")

    print(
        f"[Plugin-X] Discovery complete. Total {len(blueprints)} blueprints discovered."
    )
    return blueprints
