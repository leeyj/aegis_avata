import os
import json
import hashlib
from routes.config import PLUGINS_DIR

# [v2.3.0] AEGIS Extreme Cache (AXC) - Server side
_PLUGIN_PACK_CACHE = {"json": None, "raw": None, "hash": None}

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

                    # [v4.0] Hybrid Level Injection for System Plugins
                    system_ids = {
                        "title",
                        "sidebar",
                        "unit-select",
                        "plugin-loader",
                        "wallpaper",
                        "core-bridge",
                    }
                    if "hybrid_level" not in manifest:
                        if plugin_id in system_ids or manifest.get("priority", 100) < 0:
                            manifest["hybrid_level"] = 1
                        else:
                            manifest["hybrid_level"] = 2  # Default to Iframe in v4.0

                    pack["plugins"].append(manifest)
            except Exception as e:
                print(f"[InitPack] Error processing {plugin_id}: {e}")

    # 리스트 정렬
    pack["plugins"].sort(key=lambda p: p.get("priority", 100))

    # [v2.3.0] 해시 생성 및 캐시 저장
    json_str = json.dumps(pack)
    bundle_hash = hashlib.sha256(json_str.encode("utf-8")).hexdigest()

    _PLUGIN_PACK_CACHE["raw"] = pack
    _PLUGIN_PACK_CACHE["json"] = json_str
    _PLUGIN_PACK_CACHE["hash"] = bundle_hash
    return pack

def get_plugin_cache():
    return _PLUGIN_PACK_CACHE
