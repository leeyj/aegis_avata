/**
 * AEGIS Tactical Synchronization Client (Phase 4)
 * ---------------------------------------------
 * 외부 봇(Discord 등)에서 들어온 명령을 실시간으로 HUD에 반영합니다.
 */

class SocketSyncClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this._retryCount = 0;
        this._maxRetries = 5;
        this.init();
    }

    init() {
        try {
            // io 라이브러리 로드 확인 (안전장치)
            if (typeof io === 'undefined') {
                this._retryCount++;
                if (this._retryCount > this._maxRetries) {
                    console.warn("[SocketSync] 'io' library not available after max retries. Socket features disabled.");
                    return;
                }
                console.warn(`[SocketSync] 'io' library not ready, retrying (${this._retryCount}/${this._maxRetries})...`);
                setTimeout(() => this.init(), 300);
                return;
            }

            // Flask-SocketIO 서버에 연결 (프록시 대응을 위해 전송 방식 명시 및 재연결 옵션 강화)
            this.socket = io({
                transports: ['websocket', 'polling'], // WebSocket 우선 시도
                upgrade: true,
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000
            });

            this.socket.on('connect', () => {
                console.log("[SocketSync] 🛡️ AEGIS Tactical Link Established.");
                this.isConnected = true;
            });

            this.socket.on('disconnect', () => {
                console.warn("[SocketSync] ⚠️ Tactical Link Severed.");
                this.isConnected = false;
            });

            // 1. AI 채팅 반응 (Discord NLP 대화 시)
            this.socket.on('ai_chat', (data) => {
                console.log("[SocketSync] AI Interaction detected:", data);

                // [v2.8.7] 듀얼 보이스 방지 및 실제 데이터 반영
                const reactions = [];

                // 1) 아바타 동작 설정
                if (data.motion) {
                    reactions.push({ type: 'MOTION', alias: data.motion });
                }

                // 2) 음성 및 텍스트 설정
                if (data.briefing || data.response) {
                    // 실제 결과값이 왔을 때 해당 내용 출력
                    reactions.push({
                        type: 'TTS',
                        template: data.briefing || data.response,
                        visual_type: 'ai'
                    });
                } else if (data.motion === 'thinking') {
                    // '생각 중' 단계에서는 텍스트만 표시하거나 짧은 동작 안내 (음성 중복 방지를 위해 템플릿 제외 가능)
                    // 필요 시 여기에 '분석을 시작합니다' 등을 넣을 수 있지만, 현재는 동작만 트리거
                    console.log("[SocketSync] AI is thinking...");
                }

                if (reactions.length > 0) {
                    this.triggerReaction(reactions, data);
                }
            });

            // 2. 시스템 명령어 반응 (슬래시 명령어 등)
            this.socket.on('system_command', (data) => {
                console.log("[SocketSync] System Command received:", data);

                // [v2.9.0] 전역 이벤트 전파 (플러그인 동기화용)
                window.dispatchEvent(new CustomEvent('AEGIS_SYSTEM_COMMAND', { detail: data }));

                const reactions = [];

                // [v2.9.4] 알람 발생 시 음성 출력 및 동작 추가
                if (data.command === 'ALARM_TRIGGER' && data.text) {
                    reactions.push({ type: 'MOTION', alias: 'happy' });
                    reactions.push({ type: 'TTS', template: data.text });
                } else {
                    reactions.push({ type: 'EVENT', value: 'NOTIFY', message: 'Command Received' });
                }

                if (reactions.length > 0) {
                    this.triggerReaction(reactions, data);
                }
            });

            // 3. 리포트 생성 반응 (이미지 카드 전송 시)
            this.socket.on('system_report', (data) => {
                console.log("[SocketSync] Tactical Report generated:", data);
                this.triggerReaction([
                    { type: 'MOTION', alias: 'happy' },
                    { type: 'SENTIMENT', value: 'OPTIMAL' },
                    { type: 'TTS', template: '분석 리포트가 생성되었습니다! 디스코드 채널로 보고서를 전송했으니 확인해 주십시오.' }
                ], data);
            });

        } catch (e) {
            console.error("[SocketSync] Engine initialization failed:", e);
        }
    }

    /**
     * ReactionEngine을 통해 실제 아바타 동작 실행
     */
    triggerReaction(actions, data) {
        if (window.reactionEngine && window.reactionEngine.commander) {
            // ReactionEvaluator가 템플릿을 파싱할 수 있도록 빈 데이터와 함께 전달
            window.reactionEngine.commander.execute(actions, data, window.reactionEngine.evaluator);
        } else {
            console.error("[SocketSync] ReactionEngine is not ready.");
        }
    }
}

// 싱글톤 인스턴스 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.socketSync = new SocketSyncClient();
});
