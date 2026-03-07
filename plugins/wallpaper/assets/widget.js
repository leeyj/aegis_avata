/**
 * AEGIS Wallpaper Plugin-X Entry
 */
export default {
    init: function (shadowRoot, context) {
        context.log("Wallpaper Widget Initialized.");

        // 전역 WallpaperManager가 이미 로드되어 있음을 가정 (또는 여기서 로드)
        if (window.WallpaperManager) {
            window.WallpaperManager.init(shadowRoot); // 초기화 및 렌더링 호출

            // 터미널 명령어 등록
            const handleWPCommand = (cmd) => {
                const parts = cmd.split(' ');
                const action = parts[1]; // mode, url, solid

                if (action === 'solid' && parts[2]) {
                    window.WallpaperManager.updateConfig({ mode: 'solid', current: parts[2], is_video: false });
                    context.appendLog('WALLPAPER', `🎨 배경색이 ${parts[2]}색으로 변경되었습니다.`);
                } else if (action === 'url' && parts[2]) {
                    if (!window.IS_SPONSOR) {
                        context.appendLog('SYSTEM', '❌ 웹 배경(URL) 기능은 스폰서 전용 기능입니다.');
                        return;
                    }
                    window.WallpaperManager.handleURLChange(parts[2]);
                    context.appendLog('WALLPAPER', `🌐 웹 배경(URL)이 적용되었습니다.`);
                } else if (action === 'mode' && parts[2]) {
                    const mode = parts[2].toLowerCase();
                    if ((mode === 'rotation' || mode === 'url') && !window.IS_SPONSOR) {
                        context.appendLog('SYSTEM', `❌ ${mode} 모드는 스폰서 전용 기능입니다.`);
                        return;
                    }
                    window.WallpaperManager.handleModeChange(parts[2]);
                    context.appendLog('WALLPAPER', `⚙️ 배경 모드가 ${mode}(으)로 변경되었습니다.`);
                } else {
                    context.appendLog('SYSTEM', '사용법: /wp [solid #color | url <http> | mode rotation|static|solid]');
                }
            };

            context.registerCommand('/wp', handleWPCommand);
            context.registerCommand('/wallpaper', handleWPCommand);
        }
    },
    destroy: function () {
        console.log("[Plugin-X] Wallpaper Widget Destroyed.");
    }
};
