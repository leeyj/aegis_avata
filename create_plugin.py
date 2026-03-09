#!/usr/bin/env python3
"""
AEGIS Plugin-X 보일러플레이트 생성기 (v1.1.0) [v3.8.5 호환]
==============================================
플러그인 개발 시 약 30개의 필수 규칙을 자동으로 준수하는 템플릿을 생성합니다.
이 도구를 사용하면 개발자는 비즈니스 로직에만 집중할 수 있습니다.

사용법:
  python create_plugin.py --id my-widget --name "나의 위젯"
  python create_plugin.py --id my-widget --name "My Widget" --lang en
  python create_plugin.py --id my-widget --name "나의 위젯" --permissions api.media_proxy api.ai_gateway
  python create_plugin.py --id my-widget --name "나의 위젯" --no-backend
  python create_plugin.py --id my-widget --name "나의 위젯" --hidden
  python create_plugin.py --help

생성되는 파일:
  plugins/{id}/
  ├── __init__.py
  ├── manifest.json
  ├── config.json
  ├── router.py           (--no-backend 미지정 시)
  ├── {id}_service.py     (--no-backend 미지정 시)
  └── assets/
      ├── widget.html      (--hidden 미지정 시)
      ├── widget.js        (--hidden 미지정 시)
      └── widget.css       (--hidden 미지정 시)

운영 환경: Linux(Render.com) 호환. Windows 개발 환경에서도 동작.
"""

import argparse
import json
import os
import sys
from typing import Any

# --- 한/영 텍스트 분기 사전 ---
I18N = {
    "ko": {
        "loading": "데이터를 불러오는 중...",
        "refresh": "새로고침",
        "load_complete": "데이터 로드 완료",
        "load_fail": "데이터를 불러올 수 없습니다.",
        "load_fail_log": "데이터 로드 실패",
        "init_msg": "초기화 중...",
        "init_done": "초기화 완료",
        "destroyed": "파괴됨",
        "status_updated": "상태를 갱신했습니다.",
        "unknown_cmd": "알 수 없는 명령",
        "help_hint": "로 사용법을 확인하세요.",
        "status_refresh": "상태 갱신",
        "help_label": "도움말",
        "sample_sensor": "샘플 데이터",
        "control": "제어",
        "operational": "정상 동작 중입니다.",
        "config_comment": "이 파일은 플러그인의 로컬 설정을 저장합니다. 직접 편집하지 않고 UI를 통해 변경합니다.",
        "pkg_comment": "이 파일이 없으면 상대 경로 임포트가 동작하지 않습니다.",
    },
    "en": {
        "loading": "Loading data...",
        "refresh": "Refresh",
        "load_complete": "Data loaded",
        "load_fail": "Failed to load data.",
        "load_fail_log": "Data load failed",
        "init_msg": "Initializing...",
        "init_done": "Initialization complete",
        "destroyed": "Destroyed",
        "status_updated": "Status refreshed.",
        "unknown_cmd": "Unknown command",
        "help_hint": "for usage.",
        "status_refresh": "Refresh status",
        "help_label": "Help",
        "sample_sensor": "Sample Data",
        "control": "Control",
        "operational": "is operating normally.",
        "config_comment": "Plugin local settings. Modify via UI, not direct editing.",
        "pkg_comment": "Required for relative imports. Do not delete.",
    },
}


def sanitize_service_name(plugin_id: str) -> str:
    """
    플러그인 ID에서 파이썬 서비스 파일명용 접두사를 생성합니다.
    예: 'my-widget' -> 'my_widget'
    """
    return plugin_id.replace("-", "_")


def create_manifest(
    plugin_id: str,
    name: str,
    permissions: list,
    has_backend: bool,
    hidden: bool,
    csp_domains: list,
    lang: str = "ko",
) -> dict:
    """manifest.json 데이터를 생성합니다."""
    manifest: dict[str, Any] = {
        "id": plugin_id,
        "name": name,
        "version": "1.0.0",
        "author": "AEGIS Developer",
        "entry": {
            "html": "assets/widget.html",
            "js": "assets/widget.js",
            "css": "assets/widget.css",
        },
    }

    if has_backend:
        manifest["entry"]["backend"] = "router.py"

    if permissions:
        manifest["permissions"] = permissions

    if hidden:
        manifest["hidden"] = True
        # hidden 플러그인은 프론트엔드 자산이 불필요
        del manifest["entry"]["html"]
        del manifest["entry"]["js"]
        del manifest["entry"]["css"]

    if not hidden:
        manifest["layout"] = {"default_size": "size-1"}

    if csp_domains:
        manifest["csp_domains"] = {"connect-src": csp_domains}

    # exports 기본 골격 (센서/명령어 공개)
    t = I18N.get(lang, I18N["ko"])
    manifest["exports"] = {
        "sensors": [
            {
                "id": "sample_sensor",
                "name": f"{name} {t['sample_sensor']}",
                "unit": "",
                "type": "number",
                "endpoint": f"/api/plugins/{plugin_id}/data",
                "field": "value",
            }
        ],
        "commands": [
            {
                "prefix": f"/{plugin_id}",
                "name": f"{name} {t['control']}",
                "examples": [f"/{plugin_id} status", f"/{plugin_id} help"],
            }
        ],
    }

    manifest["icon"] = "🔌"

    return manifest


def create_router(
    plugin_id: str, name: str, permissions: list, lang: str = "ko"
) -> str:
    """router.py 파일 내용을 생성합니다."""
    service_name = sanitize_service_name(plugin_id)
    service_class = (
        "".join(word.capitalize() for word in plugin_id.split("-")) + "Service"
    )
    bp_name = sanitize_service_name(plugin_id) + "_plugin"
    perm = permissions[0] if permissions else "api.ai_gateway"
    # 주석 언어 분기
    if lang == "en":
        c_header = f"AEGIS Plugin-X Backend Router: {name}"
        c_rules = """⛔ Required Rules:\n  1. All routes must follow /api/plugins/{id}/... pattern.\n  2. register_context_provider must be called once at module level.\n  3. register_plugin_action must be used for all terminal/AI actions.\n  4. Use relative imports (from .xxx_service import ...)"""
        c_imports = "System standard imports (never use json.load directly)"
        c_security = "Security decorators"
        c_briefing = "Briefing engine integration"
        c_relative = f"Relative import (service file: {service_name}_service.py)"
        c_ctx_warn = "CAUTION: This call must run once at module top level only.\n#    Calling inside a route handler causes duplicate registration bugs!"
        c_ctx_doc = "Returns plugin status summary for AI briefing."
        c_init_doc = "Initialize plugin and register actions"
        init_doc = c_init_doc
        c_action_doc = f"Action: Get current status of {name}"
        c_view_doc = "View Handler: Formats result for Discord/Web"
        c_alias = "Terminal alias for this plugin"
        c_config_doc = "Plugin config GET/POST endpoint"
        c_data_doc = "Returns plugin data."
        c_status_doc = "Returns current status. Matches exports.sensors endpoint."
    else:
        c_header = f"AEGIS Plugin-X 백엔드 라우터: {name}"
        c_rules = f"""⛔ 필수 규칙:\n  1. 모든 라우트 경로는 /api/plugins/{plugin_id}/... 패턴을 따라야 합니다.\n  2. register_context_provider는 모듈 로드 시 1회만 호출합니다.\n  3. 모든 터미널/AI 액션은 register_plugin_action을 통해 등록해야 합니다.\n  4. 상대 경로 임포트 사용 필수 (from .{service_name}_service import ...)"""
        c_imports = "시스템 표준 임포트 (절대 json.load 직접 사용 금지)"
        c_security = "보안 데코레이터 임포트"
        c_briefing = "브리핑 엔진 연동"
        c_relative = f"상대 경로 임포트 (서비스 파일명: {service_name}_service.py)"
        c_ctx_warn = "주의: 이 호출은 모듈 최상단에서 1회만 실행되어야 합니다.\n#    라우트 핸들러 내부에서 호출하면 중복 등록 버그 발생!"
        c_ctx_doc = "AI 브리핑용 상태 요약을 반환합니다."
        c_init_doc = "플러그인 초기화 및 액션 등록"
        init_doc = c_init_doc
        c_action_doc = f"액션: {name} 현재 상태 조회"
        c_view_doc = "뷰 핸들러: 결과를 Discord/Web에 맞게 포맷팅"
        c_alias = "터미널에서 한글 별칭으로 호출 가능"
        c_config_doc = "플러그인 설정 조회/수정 엔드포인트"
        c_data_doc = "플러그인 데이터를 반환합니다."
        c_status_doc = (
            "현재 상태를 반환합니다. exports.sensors의 endpoint와 매칭됩니다."
        )

    return f'''"""
{c_header}
======================================
{c_rules}
"""
import os
from flask import Blueprint, jsonify, request

# ✅ {c_imports}
from utils import load_json_config, save_json_config, get_plugin_i18n

# ✅ {c_security}
from routes.decorators import login_required, standardized_plugin_response
from services import require_permission

# ✅ {c_briefing}
from services.plugin_registry import register_context_provider

# ✅ {c_relative}
from .{service_name}_service import {service_class}

# --- Path setup ---
PLUGIN_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(PLUGIN_DIR, "config.json")

# --- Blueprint ---
{bp_name}_bp = Blueprint("{bp_name}", __name__)


# ═══════════════════════════════════════════════════════
# [0] Context Provider
# ⛔ {c_ctx_warn}
# ═══════════════════════════════════════════════════════
def get_{service_name}_context():
    """{c_ctx_doc}"""
    try:
        return {service_class}.get_status()
    except Exception as e:
        return {{"error": str(e)}}


register_context_provider(
    "{plugin_id}",
    get_{service_name}_context,
    aliases=["{name}"]  # ← {c_alias}
)


# ═══════════════════════════════════════════════════════
# [1] Plugin Initialization & Actions (v3.6.0 i18n)
# ═══════════════════════════════════════════════════════
def initialize_plugin():
    """{init_doc}"""
    from services.plugin_registry import register_plugin_action

    # 1. 커스텀 액션 등록 예시
    def my_action_view_handler(result, platform="web", lang=None):
        """{c_view_doc}"""
        if not result:
            return get_plugin_i18n("{plugin_id}", "views.fail", lang=lang)
        
        msg = get_plugin_i18n("{plugin_id}", "views.success", lang=lang)
        return f"{{msg}} (Data: {{result}})"

    register_plugin_action(
        plugin_id="{plugin_id}",
        action_id="my_action",
        handler=lambda: {service_class}.get_status(), # 예시 핸들러
        desc=get_plugin_i18n("{plugin_id}", "actions.my_action.desc"),
        args=get_plugin_i18n("{plugin_id}", "actions.my_action.args"),
        view_handler=my_action_view_handler,
    )


# 플러그인 로드 시 초기화 실행
initialize_plugin()


# ═══════════════════════════════════════════════════════
# [2] 설정 관리 (GET/POST 표준 패턴)
# ═══════════════════════════════════════════════════════
@{bp_name}_bp.route("/api/plugins/{plugin_id}/config", methods=["GET", "POST"])
@login_required
@standardized_plugin_response
def handle_config():
    """{c_config_doc}"""
    if request.method == "POST":
        data = request.json
        current = load_json_config(CONFIG_PATH)
        current.update(data)
        save_json_config(CONFIG_PATH, current)
        return jsonify({{"status": "success", "config": current}})
    return jsonify(load_json_config(CONFIG_PATH))


# ═══════════════════════════════════════════════════════
# [3] 데이터 조회 API (Dashboard 기반)
# ═══════════════════════════════════════════════════════
@{bp_name}_bp.route("/api/plugins/{plugin_id}/data")
@login_required
@require_permission("{perm}")
@standardized_plugin_response
def get_data():
    """{c_data_doc}"""
    config = load_json_config(CONFIG_PATH)
    return jsonify({service_class}.get_data(config))


# ═══════════════════════════════════════════════════════
# [4] Status API (Sensor 기반)
# ═══════════════════════════════════════════════════════
@{bp_name}_bp.route("/api/plugins/{plugin_id}/status")
@login_required
@standardized_plugin_response
def get_status():
    """{c_status_doc}"""
    return jsonify({service_class}.get_status())
'''


def create_service(plugin_id: str, name: str, lang: str = "ko") -> str:
    """서비스 파일 내용을 생성합니다."""
    service_class = (
        "".join(word.capitalize() for word in plugin_id.split("-")) + "Service"
    )
    t = I18N.get(lang, I18N["ko"])

    if lang == "en":
        c_header = f"AEGIS Plugin-X Service: {name}"
        c_desc = "Implement business logic in this file."
        c_rule = "File naming rule: MUST be {plugin_id}_service.py format.\n   Using service.py causes namespace collisions with other plugins."
        c_class_doc = f"{name} Core Business Logic Class"
        c_get_data_doc = "Retrieves main plugin data."
        c_get_status_doc = (
            "Summarizes current status for briefing engine and scheduler."
        )
    else:
        c_header = f"AEGIS Plugin-X 서비스: {name}"
        c_desc = "비즈니스 로직을 이 파일에 구현합니다."
        c_rule = "파일명 규칙: 반드시 {plugin_id}_service.py 형태여야 합니다.\n   service.py로 지으면 다른 플러그인과 네임스페이스 충돌이 발생합니다."
        c_class_doc = f"{name} 핵심 비즈니스 로직 클래스"
        c_get_data_doc = "플러그인의 메인 데이터를 조회합니다."
        c_get_status_doc = (
            "현재 상태를 요약합니다. 브리핑 엔진 및 스케줄러가 호출합니다."
        )

    return f'''"""
{c_header}
========================================
{c_desc}
⛔ {c_rule}
"""
from utils import load_json_config, save_json_config


class {service_class}:
    """
    {c_class_doc}
    """

    @staticmethod
    def get_data(config: dict = None) -> dict:
        """{c_get_data_doc}"""
        # TODO: Implement business logic here
        return {{
            "value": 0,
            "message": "{name} {t["load_complete"]}"
        }}

    @staticmethod
    def get_status() -> dict:
        """{c_get_status_doc}"""
        # TODO: Implement status summary
        return {{
            "value": 0,
            "status": "operational",
            "summary": "{name} {t["operational"]}"
        }}
'''


def create_widget_html(plugin_id: str, name: str, lang: str = "ko") -> str:
    """widget.html 내용을 생성합니다."""
    t = I18N.get(lang, I18N["ko"])
    return f'''<!--
  AEGIS Plugin-X Widget HTML: {name}
  ⛔ Rules:
    1. This file is injected into Shadow DOM via innerHTML.
    2. <script> tags will not execute. Put all logic in widget.js.
    3. DOM access: shadowRoot.querySelector() only.
-->
<div class="{plugin_id}-container">
    <div class="{plugin_id}-header">
        <h3 class="i18n" data-key="{plugin_id}.title">{name}</h3>
    </div>

    <div class="{plugin_id}-content" id="main-content">
        <p class="status-text" id="status-text">{t["loading"]}</p>
    </div>

    <div class="{plugin_id}-actions no-drag">
        <button class="action-btn no-drag" id="refresh-btn">{t["refresh"]}</button>
    </div>
</div>
'''


def create_widget_js(plugin_id: str, name: str, lang: str = "ko") -> str:
    """widget.js 내용을 생성합니다."""
    t = I18N.get(lang, I18N["ko"])
    return f'''/**
 * AEGIS Plugin-X 위젯 모듈: {name}
 * ==========================================
 * ⛔ 필수 규칙:
 *   1. 모든 DOM 접근은 shadowRoot.querySelector()를 사용
 *   2. 전역 변수(window.xxx) 선언 금지 — context API만 사용
 *   3. destroy()에서 모든 타이머/리스너 해제 필수 (메모리 누수 방지)
 *   4. registerCommand에 manifest.id와 동일한 접두사 등록 필수 (알리아스 연동)
 *   5. 클릭 가능한 요소에 e.stopPropagation() 필수 (드래그 간섭 방지)
 */
export default {{
    // --- 내부 상태 ---
    updateTimer: null,
    shadow: null,
    ctx: null,

    /**
     * 플러그인 초기화 (시스템이 1회 호출)
     * @param {{ShadowRoot}} shadowRoot - Shadow DOM 루트
     * @param {{Object}} context - Capability Proxy 객체 (시스템 자원 접근용)
     */
    init: async function(shadowRoot, context) {{
        this.shadow = shadowRoot;
        this.ctx = context;
        context.log("{name} {t["init_msg"]}");

        // ═══════════════════════════════════════════════════
        // [1] 이벤트 바인딩 (⛔ stopPropagation + no-drag 필수)
        // ═══════════════════════════════════════════════════
        const refreshBtn = this.shadow.querySelector('#refresh-btn');
        if (refreshBtn) {{
            refreshBtn.addEventListener('click', (e) => {{
                e.stopPropagation();  // ⛔ 드래그 방지 필수
                this.refresh();
            }});
            refreshBtn.onmousedown = (e) => e.stopPropagation(); // ⛔ mousedown도 차단
        }}

        // ═══════════════════════════════════════════════════
        // [2] 터미널 명령어 등록
        // ⛔ manifest.json의 id와 동일한 정규 명령어를 반드시 등록!
        //    이것이 없으면 백엔드 aliases가 핸들러를 찾지 못합니다.
        // ═══════════════════════════════════════════════════
        context.registerCommand('/{plugin_id}', (param) => {{
            this.handleCommand(param);
        }});

        // ═══════════════════════════════════════════════════
        // [3] 초기 데이터 로드 + 폴링 시작
        // ═══════════════════════════════════════════════════
        await this.refresh();
        this.updateTimer = setInterval(() => this.refresh(), 300000); // 5분마다

        context.log("{name} {t["init_done"]}");
    }},

    /**
     * 데이터 새로고침
     */
    async refresh() {{
        try {{
            const res = await fetch('/api/plugins/{plugin_id}/data');
            const data = await res.json();
            const statusEl = this.shadow.querySelector('#status-text');
            if (statusEl) {{
                statusEl.textContent = data.message || '{t["load_complete"]}';
            }}
        }} catch (e) {{
            this.ctx.log(`{t["load_fail_log"]}: ${{e.message}}`);
            const statusEl = this.shadow.querySelector('#status-text');
            if (statusEl) statusEl.textContent = '{t["load_fail"]}';
        }}
    }},

    /**
     * 터미널 명령어 핸들러
     * ⛔ 반드시 이 export 객체 내부에 정의 (별도 JS 파일 금지)
     * @param {{string}} param - 명령어 접두사 이후 전체 문자열
     */
    handleCommand(param) {{
        const parts = param.trim().split(' ');
        const sub = parts[0] || '';

        switch (sub) {{
            case 'status':
                this.refresh();
                this.ctx.appendLog('{plugin_id.upper()}', '{t["status_updated"]}');
                break;
            case 'help':
                this.ctx.appendLog('{plugin_id.upper()}',
                    `/{plugin_id} status \u2014 {t["status_refresh"]}\\n/{plugin_id} help \u2014 {t["help_label"]}`);
                break;
            default:
                this.ctx.appendLog('{plugin_id.upper()}',
                    `{t["unknown_cmd"]}: ${{sub}}. /{plugin_id} help {t["help_hint"]}`);
        }}
    }},

    /**
     * 플러그인 파괴 (시스템이 위젯 제거/새로고침 시 호출)
     * ⛔ 여기서 타이머와 리스너를 반드시 해제해야 메모리 누수가 방지됩니다.
     */
    destroy: function() {{
        if (this.updateTimer) {{
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }}
        this.ctx.log("{name} {t["destroyed"]}");
    }}
}};
'''


def create_widget_css(plugin_id: str) -> str:
    """widget.css 내용을 생성합니다."""
    return f"""/*
 * AEGIS Plugin-X 스타일: {plugin_id}
 * ==============================
 * 이 CSS는 Shadow DOM 내부에 격리됩니다 (외부 영향 없음).
 * 시스템 표준 CSS 변수를 사용하여 테마 일관성을 유지하세요.
 *
 * 사용 가능한 시스템 CSS 변수:
 *   --neon-blue, --neon-purple, --glass, --bg-dark
 */

/* ✅ Google Fonts (Premium Aesthetics 필수) */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap');

.{plugin_id}-container {{
    font-family: 'Outfit', sans-serif;
    padding: 16px;
    color: #e0e0e0;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
}}

.{plugin_id}-header h3 {{
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #ffffff;
}}

.{plugin_id}-content {{
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    /* ✅ 글래스모피즘 (필수 디자인 요소) */
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 12px;
    padding: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}}

.status-text {{
    font-size: 0.95rem;
    color: #b0b0b0;
    text-align: center;
}}

/* ✅ 인터랙티브 요소: 호버 효과 + 부드러운 트랜지션 필수 */
.action-btn {{
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-family: 'Outfit', sans-serif;
    font-size: 0.85rem;
    transition: all 0.3s ease;
}}

.action-btn:hover {{
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}}

.action-btn:active {{
    transform: translateY(0);
}}

/* ✅ no-drag 클래스 영역은 위젯 드래그와 간섭하지 않음 */
.{plugin_id}-actions {{
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}}
"""


def create_config(lang: str = "ko") -> dict:
    """기본 config.json 데이터를 생성합니다."""
    t = I18N.get(lang, I18N["ko"])
    return {
        "_comment": t["config_comment"],
        "polling_interval_ms": 300000,
    }


def create_i18n_json(plugin_path, plugin_id):
    content = {
        "ko": {
            "panels": {"p-" + plugin_id: plugin_id.capitalize()},
            "actions": {
                "my_action": {"desc": "내 커스텀 액션 설명", "args": ["인자1"]}
            },
            "views": {
                "success": "작업이 성공적으로 완료되었습니다.",
                "fail": "작업 처리에 실패했습니다.",
            },
        },
        "en": {
            "panels": {"p-" + plugin_id: plugin_id.capitalize()},
            "actions": {
                "my_action": {"desc": "My custom action description", "args": ["Arg1"]}
            },
            "views": {
                "success": "Task completed successfully.",
                "fail": "Failed to process task.",
            },
        },
    }
    file_path = os.path.join(plugin_path, "i18n.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=4)
    print(f"Created: {file_path}")


def main():
    parser = argparse.ArgumentParser(
        description="AEGIS Plugin-X 보일러플레이트 생성기",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python create_plugin.py --id my-widget --name "나의 위젯"
  python create_plugin.py --id email-notify --name "이메일 알림" --permissions api.ai_gateway
  python create_plugin.py --id bg-service --name "백그라운드 서비스" --hidden --no-backend
  python create_plugin.py --id stock-alert --name "주식 알림" --csp-domains "https://api.example.com"

자동으로 적용되는 규칙 (약 20개):
  ✅ 폴더 구조 및 __init__.py
  ✅ manifest.json 필수 필드 및 exports 골격
  ✅ /api/plugins/{id}/... 라우트 패턴
  ✅ {id}_service.py 네이밍 규칙
  ✅ 상대 경로 임포트 (from .xxx_service import ...)
  ✅ register_context_provider 모듈 레벨 1회 호출
  ✅ standardized_plugin_response 데코레이터
  ✅ context API 전용 코드 (window 직접 접근 금지)
  ✅ shadowRoot.querySelector 사용
  ✅ registerCommand의 manifest.id 일치
  ✅ e.stopPropagation() 및 .no-drag 클래스
  ✅ destroy()에서 clearInterval
  ✅ Google Fonts 및 glassmorphism 디자인
  ✅ utils.load_json_config / save_json_config 사용
        """,
    )
    parser.add_argument(
        "--id", required=True, help="플러그인 고유 ID (폴더명, 예: my-widget)"
    )
    parser.add_argument(
        "--name", required=True, help="플러그인 표시 이름 (한국어, 예: 나의 위젯)"
    )
    parser.add_argument(
        "--permissions",
        nargs="*",
        default=[],
        help="필요한 시스템 권한 목록 (예: api.media_proxy api.ai_gateway)",
    )
    parser.add_argument(
        "--no-backend",
        action="store_true",
        help="백엔드(router.py, *_service.py)를 생성하지 않음",
    )
    parser.add_argument(
        "--hidden", action="store_true", help="UI 없이 백엔드만 동작하는 플러그인 생성"
    )
    parser.add_argument(
        "--csp-domains",
        nargs="*",
        default=[],
        help="CSP에 등록할 외부 도메인 (예: https://api.example.com)",
    )
    parser.add_argument(
        "--lang",
        choices=["ko", "en"],
        default="ko",
        help="생성 코드의 주석/UI 텍스트 언어 (default: ko)",
    )

    args = parser.parse_args()

    # 유효성 검증
    if not args.id.replace("-", "").isalnum():
        print("❌ 오류: --id는 영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.")
        sys.exit(1)

    # 기본 경로 설정 (크로스 플랫폼)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    plugin_dir = os.path.join(base_dir, "plugins", args.id)
    assets_dir = os.path.join(plugin_dir, "assets")

    # 이미 존재하는지 체크
    if os.path.exists(plugin_dir):
        print(f"❌ 오류: 플러그인 폴더가 이미 존재합니다: {plugin_dir}")
        print("   기존 플러그인을 덮어쓰려면 먼저 폴더를 삭제하세요.")
        sys.exit(1)

    # 디렉토리 생성
    os.makedirs(assets_dir, exist_ok=True)
    print(f"📁 디렉토리 생성: plugins/{args.id}/")
    print(f"📁 디렉토리 생성: plugins/{args.id}/assets/")

    has_backend = not args.no_backend
    service_name = sanitize_service_name(args.id)
    lang = args.lang
    t = I18N.get(lang, I18N["ko"])

    # __init__.py (빈 파일 — 상대 경로 임포트에 필수)
    init_path = os.path.join(plugin_dir, "__init__.py")
    with open(init_path, "w", encoding="utf-8") as f:
        f.write(f"# AEGIS Plugin-X: {args.name}\n# {t['pkg_comment']}\n")
    print("  ✅ __init__.py")

    # manifest.json
    manifest = create_manifest(
        args.id,
        args.name,
        args.permissions,
        has_backend,
        args.hidden,
        args.csp_domains,
        lang,
    )
    manifest_path = os.path.join(plugin_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=4)
    print("  ✅ manifest.json")

    # config.json
    config_path = os.path.join(plugin_dir, "config.json")
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(create_config(lang), f, ensure_ascii=False, indent=4)
    print("  ✅ config.json")

    # 백엔드 파일
    if has_backend:
        router_path = os.path.join(plugin_dir, "router.py")
        with open(router_path, "w", encoding="utf-8") as f:
            f.write(create_router(args.id, args.name, args.permissions, lang))
        print("  ✅ router.py")

        service_filename = f"{service_name}_service.py"
        service_path = os.path.join(plugin_dir, service_filename)
        with open(service_path, "w", encoding="utf-8") as f:
            f.write(create_service(args.id, args.name, lang))
        print(f"  ✅ {service_filename}")

    create_i18n_json(plugin_dir, args.id)

    # 프론트엔드 파일 (hidden이 아닐 때만)
    if not args.hidden:
        html_path = os.path.join(assets_dir, "widget.html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(create_widget_html(args.id, args.name, lang))
        print("  ✅ assets/widget.html")

        js_path = os.path.join(assets_dir, "widget.js")
        with open(js_path, "w", encoding="utf-8") as f:
            f.write(create_widget_js(args.id, args.name, lang))
        print("  ✅ assets/widget.js")

        css_path = os.path.join(assets_dir, "widget.css")
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(create_widget_css(args.id))
        print("  ✅ assets/widget.css")

    # 완료 메시지
    print(f"\n{'=' * 55}")
    print(f"🎉 플러그인 '{args.name}' ({args.id}) 생성 완료!")
    print(f"{'=' * 55}")
    print(f"\n📍 위치: plugins/{args.id}/")
    print("\n📋 다음 단계:")
    print(f"  1. {service_name}_service.py 에서 비즈니스 로직을 구현하세요.")

    if not args.hidden:
        print("  2. assets/widget.html 에서 UI를 디자인하세요.")
        print("  3. assets/widget.js 의 refresh()에서 데이터 바인딩을 구현하세요.")
    else:
        print("  2. 시스템 대시보드를 새로고침하여 서비스가 로드되는지 확인하세요.")

    print("  4. manifest.json 의 exports.sensors를 실제 데이터에 맞게 수정하세요.")
    print(
        "  5. (참고: 모든 핵심 로직은 이제 /static/js/loader/ 모듈에 의해 관리됩니다.)"
    )
    print("  6. 서버를 재시작하면 자동으로 로드됩니다.")

    if args.permissions:
        print(f"\n🔐 등록된 권한: {', '.join(args.permissions)}")
    if args.csp_domains:
        print(f"🌐 등록된 CSP 도메인: {', '.join(args.csp_domains)}")

    print()


if __name__ == "__main__":
    main()
