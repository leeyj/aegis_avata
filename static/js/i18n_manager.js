/**
 * AEGIS i18n Manager - Security & Stability Enhanced (v1.5.2)
 * Handles language pack loading, automatic translation, and security sanitization.
 */

window.i18nData = {};
window.i18nFallback = {}; // 누락된 키 보강을 위한 기본 언어팩(ko)
window.currentLang = 'ko';

const I18nManager = {
    observer: null,

    /**
     * 언어팩 초기화 및 보안/에러 복구 로직 탑재
     */
    init: async function () {
        try {
            // 1. 기본 언어팩(ko) 무조건 로딩 (API 활용으로 경로 오류 방지)
            const fallbackRes = await fetch('/i18n_config?lang=ko');
            if (fallbackRes.ok) {
                window.i18nFallback = await fallbackRes.json();
            }

            // 2. 현재 선택 언어 설정 확인
            const configRes = await fetch('/get_settings');
            if (configRes.ok) {
                const settings = await configRes.json();
                window.currentLang = settings.lang || 'ko';
            }

            // 3. 현재 언어팩 로드
            try {
                const response = await fetch('/i18n_config');
                if (!response.ok) throw new Error("Server Error");
                window.i18nData = await response.json();
            } catch (innerE) {
                console.warn("[i18n] Syntax error or missing pack. Falling back to default.");
                window.i18nData = window.i18nFallback;
            }

            // 4. 언어 선택기 및 자동 감시 시작
            await this.renderLanguageSelector();
            this.applyI18n(document.body);
            this.startAutoObserve(document.body);

            console.log("[i18n] Security-hardened Auto-Translation Engine Online.");
        } catch (e) {
            console.error("[i18n] Fatal init error:", e);
        }
    },

    /**
     * 사용 가능한 언어 목록 동적 생성
     */
    renderLanguageSelector: async function () {
        const selector = document.getElementById('language-selector');
        if (!selector) return;

        try {
            const res = await fetch('/api/i18n/list');
            const langs = await res.json();

            const select = document.createElement('select');
            select.className = 'sidebar-select';
            select.style.cssText = 'width: 100%; padding: 8px; font-size: 0.8rem; background: rgba(0,0,0,0.5); color: #00ffff; border: 1px solid rgba(0,255,255,0.3); border-radius: 4px; cursor: pointer; font-family: "Orbitron", sans-serif;';

            langs.forEach(langObj => {
                const opt = document.createElement('option');
                opt.value = langObj.code;
                opt.innerText = langObj.name;
                if (langObj.code === window.currentLang) opt.selected = true;
                select.appendChild(opt);
            });

            select.onchange = (e) => this.setLanguage(e.target.value);
            selector.innerHTML = '';
            selector.appendChild(select);
        } catch (e) { console.error("[i18n] Selector error:", e); }
    },

    /**
     * 경로 기반 데이터 조회 (Fallback 지원)
     */
    translate: function (path) {
        let value = this.getValueFromPath(window.i18nData, path);

        // [방어] 키가 없으면 기본 언어(fallback)에서 재시도시
        if ((value === undefined || value === path) && window.i18nFallback) {
            value = this.getValueFromPath(window.i18nFallback, path);
        }

        return value || path;
    },

    getValueFromPath: function (obj, path) {
        if (!obj) return path;
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
            if (current && current[key] !== undefined) {
                current = current[key];
            } else {
                return path;
            }
        }
        return current;
    },

    /**
     * 특정 엘리먼트에 안전한 번역 적용 (XSS 방어)
     */
    applyToElement: function (el, skipChildren = false) {
        if (!el || !el.getAttribute) return;

        const key = el.getAttribute('data-i18n');
        if (key) {
            const translation = this.translate(key);

            // [보안] 속성 번역 처리
            if (key.startsWith('[') && key.includes(']')) {
                const attr = key.substring(1, key.indexOf(']'));
                const realKey = key.substring(key.indexOf(']') + 1);
                el.setAttribute(attr, this.translate(realKey));
            }
            // [보안] 폼 요소 처리
            else if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
                el.value = translation;
            } else if (el.tagName === 'INPUT' && el.placeholder) {
                el.placeholder = translation;
            }
            // [핵심 보안] textContent 사용을 기본으로 하여 XSS 방어
            // HTML(아이콘 등)이 명시적으로 필요한 경우에만 innerHTML 허용
            else {
                if (el.hasAttribute('data-i18n-safe')) {
                    el.innerHTML = translation;
                } else {
                    el.textContent = translation;
                }
            }
        }

        if (!skipChildren) this.applyI18n(el);
    },

    applyI18n: function (root = document) {
        const elements = root.querySelectorAll('[data-i18n]');
        elements.forEach(el => this.applyToElement(el, true));
    },


    startAutoObserve: function (target) {
        if (!target) return;
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) this.applyToElement(node);
                    });
                } else if (mutation.type === 'attributes' && mutation.attributeName === 'data-i18n') {
                    this.applyToElement(mutation.target, true);
                }
            });
        });

        observer.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-i18n']
        });
        return observer;
    },

    setLanguage: async function (lang) {
        try {
            window.currentLang = lang;
            // window.saveSettings() 제거: /save_language API가 마스터 저장소(settings.json)를 직접 갱신함

            const response = await fetch('/save_language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lang: lang })
            });

            if (response.ok) window.location.reload();
        } catch (e) { console.error("[i18n] Save failed:", e); }
    }
};

window._t = (key) => I18nManager.translate(key);
window.applyI18n = (root) => I18nManager.applyI18n(root);
window.I18nManager = I18nManager;
