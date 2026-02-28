/**
 * AEGIS i18n Manager - Multi-language Support
 * Handles language pack loading and UI string translation.
 */

window.i18nData = {};
window.currentLang = 'ko';

const I18nManager = {
    /**
     * 서버에서 현재 언어 설정에 맞는 언어팩 로드
     */
    init: async function () {
        try {
            const response = await fetch('/i18n_config');
            window.i18nData = await response.json();

            // 현재 언어 정보 본문에 클래스로 추가 (CSS 분기용)
            // 실제 lang 값은 서버 응답의 구조에 따라 다르지만 보통 ko/en 고정
            document.body.classList.remove('lang-ko', 'lang-en');
            // 간단하게 window.i18nData 구조에서 추론하거나 별도 fetch 필요
            // 여기서는 기본적으로 로드된 데이터가 있으면 성공으로 간주

            this.applyI18n();
            console.log("[i18n] Language pack loaded and applied.");
        } catch (e) {
            console.error("[i18n] Failed to load language pack:", e);
        }
    },

    /**
     * 키값을 기반으로 번역된 문자열 반환
     * @param {string} path - "sidebar.save_settings" 형식의 키
     * @returns {string} 번역된 문자열 또는 키값 그대로
     */
    translate: function (path) {
        if (!window.i18nData) return path;

        const keys = path.split('.');
        let value = window.i18nData;

        for (const key of keys) {
            if (value && value[key] !== undefined) {
                value = value[key];
            } else {
                return path; // 키가 없으면 경로 그대로 반환
            }
        }

        return value;
    },

    /**
     * DOM 내 data-i18n 속성을 가진 모든 엘리먼트 번역 적용
     */
    applyI18n: function () {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.translate(key);

            if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit')) {
                el.value = translation;
            } else if (el.tagName === 'INPUT' && el.placeholder) {
                el.placeholder = translation;
            } else {
                el.innerText = translation;
            }
        });
    },

    /**
     * 언어 변경 및 서버 저장
     */
    setLanguage: async function (lang) {
        try {
            const response = await fetch('/save_language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lang: lang })
            });

            if (response.ok) {
                window.location.reload(); // 전체 환경(AI 프롬프트 포함) 갱신을 위해 리로드
            }
        } catch (e) {
            console.error("[i18n] Failed to save language:", e);
        }
    }
};

// 글로벌 단축 함수 등록
window._t = (key) => I18nManager.translate(key);
window.applyI18n = () => I18nManager.applyI18n();

// 엔진 초기화 시 호출될 수 있도록 대기
// core.js의 initEngine에서 Promise.all에 포함될 예정
