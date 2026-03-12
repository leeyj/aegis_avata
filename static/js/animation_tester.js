/**
 * AEGIS Animation System Tester
 * Temporary control panel for verifying event-based reactions.
 * Dynamically generated based on current model assets.
 */

(function () {
    // console.log("[Tester] Animation System Tester Loaded. Press 'Shift + T' to toggle panel.");

    const testerUI = document.createElement('div');
    testerUI.id = 'animation-tester-panel';
    testerUI.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 320px;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(15px);
        border: 1px solid rgba(0, 255, 255, 0.4);
        border-radius: 12px;
        padding: 20px;
        z-index: 9999;
        font-family: 'Rajdhani', sans-serif;
        color: white;
        display: block;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    `;

    testerUI.innerHTML = `
        <div style="font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 15px; color: #00ffff; display: flex; justify-content: space-between; align-items: center;">
            <span style="letter-spacing: 1px; font-size: 16px;">ANIMATION TESTER</span>
            <button id="btn-refresh-tester" style="background:rgba(0,255,255,0.1); border:1px solid #00ffff; color:#00ffff; cursor:pointer; font-size:11px; padding: 2px 8px; border-radius: 4px;">REFRESH</button>
        </div>
        <div style="display: grid; gap: 10px;">
            <div style="display: flex; gap: 6px;">
                <button id="btn-music-start" style="flex:1">🎵 Music On</button>
                <button id="btn-music-stop" style="flex:1">🛑 Off</button>
            </div>
            <div style="display: flex; gap: 6px;">
                <button id="btn-tts-start" style="flex:1">🗣️ TTS On</button>
                <button id="btn-tts-stop" style="flex:1">🤐 Off</button>
            </div>
            <div style="display: flex; gap: 6px;">
                <button id="btn-happy-dance" style="flex:1; background: rgba(255, 105, 180, 0.2); border-color: #ff69b4; color: #ff69b4;">💖 Happy Dance</button>
            </div>
            <hr style="border:0; border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0;">
            
            <div id="tester-expressions" style="display: grid; gap: 5px; max-height: 250px; overflow-y: auto; padding-right: 8px;">
                <div style="font-size: 12px; color: #00ffff; margin-bottom: 4px; font-weight: bold; display: flex; align-items: center; gap: 5px;">🎭 Expressions</div>
            </div>
            
            <hr style="border:0; border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0;">
            
            <div id="tester-motions" style="display: grid; gap: 5px; max-height: 350px; overflow-y: auto; padding-right: 8px;">
                <div style="font-size: 12px; color: #00ffff; margin-bottom: 4px; font-weight: bold; display: flex; align-items: center; gap: 5px;">🕺 Motions</div>
            </div>
        </div>
        <div style="font-size: 11px; opacity: 0.6; margin-top: 15px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
            Toggle: <span style="color: #00ffff;">Shift + T</span>
        </div>
    `;

    document.body.appendChild(testerUI);

    function applyButtonStyle(btn) {
        btn.style.cssText = `
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: white;
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 6px;
            font-size: 13px;
            transition: all 0.2s;
            text-align: left;
            overflow: hidden;
            text-overflow: ellipsis; 
            white-space: nowrap;
            font-family: 'Rajdhani', sans-serif;
        `;
        btn.onmouseover = () => {
            btn.style.background = 'rgba(0, 255, 255, 0.2)';
            btn.style.borderColor = '#00ffff';
            btn.style.transform = 'translateX(5px)';
        };
        btn.onmouseout = () => {
            btn.style.background = 'rgba(255, 255, 255, 0.08)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            btn.style.transform = 'translateX(0)';
        };
    }

    document.getElementById('btn-music-start').onclick = () => dispatchAvatarEvent('MUSIC_START');
    document.getElementById('btn-music-stop').onclick = () => dispatchAvatarEvent('MUSIC_STOP');
    document.getElementById('btn-tts-start').onclick = () => dispatchAvatarEvent('TTS_START');
    document.getElementById('btn-tts-stop').onclick = () => dispatchAvatarEvent('TTS_STOP');
    document.getElementById('btn-happy-dance').onclick = () => dispatchAvatarEvent('HAPPY_DANCE', { duration: 5000 });
    document.getElementById('btn-refresh-tester').onclick = () => window.updateTesterUI();

    // 초기 버튼 스타일 적용
    testerUI.querySelectorAll('button').forEach(applyButtonStyle);

    // Dynamic UI Update Function
    window.updateTesterUI = () => {
        const assets = window.modelAssets;
        if (!assets) {
            if (window.logger) window.logger.warn("[Tester] No modelAssets found yet.");
            return;
        }

        const expContainer = document.getElementById('tester-expressions');
        const motContainer = document.getElementById('tester-motions');

        expContainer.innerHTML = '<div style="font-size: 11px; color: #aaa; margin-bottom: 2px;">🎭 Expressions</div>';
        motContainer.innerHTML = '<div style="font-size: 11px; color: #aaa; margin-bottom: 2px;">🕺 Motions</div>';

        if (assets.expressions && assets.expressions.length > 0) {
            assets.expressions.forEach(file => {
                const btn = document.createElement('button');
                btn.innerText = file.replace('.exp3.json', '');
                btn.onclick = () => dispatchAvatarEvent('EMOTION', { file: file });
                applyButtonStyle(btn);
                expContainer.appendChild(btn);
            });
        }

        if (assets.motions && assets.motions.length > 0) {
            assets.motions.forEach(file => {
                const btn = document.createElement('button');
                btn.innerText = file.replace('.motion3.json', '');
                btn.onclick = () => dispatchAvatarEvent('MOTION', { file: file });
                applyButtonStyle(btn);
                motContainer.appendChild(btn);
            });
        }

        if (window.logger) window.logger.info(`[Tester] UI Updated. Exp: ${assets.expressions?.length}, Mot: ${assets.motions?.length}`);
    };

    window.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.key.toLowerCase() === 't') {
            testerUI.style.display = testerUI.style.display === 'none' ? 'block' : 'none';
        }
    });

    // 모델 로딩 시간을 고려하여 여러 번 시도
    setTimeout(window.updateTesterUI, 1000);
    setTimeout(window.updateTesterUI, 3000);
    setTimeout(window.updateTesterUI, 5000);

})();
