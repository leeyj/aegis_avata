/**
 * AEGIS Wallpaper Plugin-X Entry
 */
export default {
    init: function (shadowRoot, context) {
        context.log("Wallpaper Widget Initialized.");

        // 전역 WallpaperManager가 이미 로드되어 있음을 가정 (또는 여기서 로드)
        if (window.WallpaperManager) {
            window.WallpaperManager.init(shadowRoot); // 초기화 및 렌더링 호출
        }
    },
    destroy: function () {
        console.log("[Plugin-X] Wallpaper Widget Destroyed.");
    }
};
