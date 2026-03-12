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

        // [v3.5.3] 초기 로딩 시 서버/네트워크 안정화를 위해 1.5초 후 연결 시작
        setTimeout(() => this.init(), 1500);
    }

    init() {
        try {
            // io 라이브러리 로드 확인 (안전장치)
            if (typeof io === 'undefined') {
                this._retryCount++;
                if (this._retryCount > this._maxRetries) {
                    console.error("[SocketSync] 🛑 'io' library not available. Socket features disabled.");
                    return;
                }
                console.warn(`[SocketSync] 'io' library not ready, retrying (${this._retryCount}/${this._maxRetries})...`);
                setTimeout(() => this.init(), 500);
                return;
            }

            // Flask-SocketIO 서버에 연결 (Proxy 환경에서 에러를 유발하는 websocket 업그레이드 금지)
            this.socket = io({
                transports: ['polling'], // [v3.5.3] WebSocket 에러 방지를 위해 Polling 고정
                reconnection: true,
                reconnectionAttempts: 20,
                reconnectionDelay: 1000,
                timeout: 30000
            });

            this.socket.on('connect', () => {
                const transport = this.socket.io.engine.transport.name;
                console.warn(`[SocketSync] 🛡️ AEGIS Tactical Link Established via [${transport}]`);
                this.isConnected = true;
                this._retryCount = 0;
            });

            this.socket.on('connect_error', (error) => {
                console.warn("[SocketSync] ⚠️ Connection Error Detail:", error.message);
            });

            this.socket.on('reconnect_attempt', (attempt) => {
                console.warn(`[SocketSync] 🔄 Attempting to re-establish link... (${attempt}/20)`);
            });

            this.socket.on('error', (err) => {
                console.error("[SocketSync] ‼️ Critical Socket Error:", err);
            });

            this.socket.on('disconnect', (reason) => {
                console.warn("[SocketSync] ⚠️ Tactical Link Severed. Reason:", reason);
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
                        audioUrl: data.audio_url, // 서버에서 미리 생성된 URL이 있으면 우선 사용
                        visualType: data.visual_type || 'ai'
                    });
                } else if (data.motion === 'thinking') {
                    // '생각 중' 단계에서는 텍스트만 표시하거나 짧은 동작 안내 (음성 중복 방지를 위해 템플릿 제외 가능)
                    // 필요 시 여기에 '분석을 시작합니다' 등을 넣을 수 있지만, 현재는 동작만 트리거
                    console.log("[SocketSync] AI is thinking...");
                }

                if (reactions.length > 0) {
                    // [v3.4.6] 브라우저 오토플레이 차단 방지를 위한 오디오 잠금 해제 시도
                    if (window.AudioContext || window.webkitAudioContext) {
                        try {
                            const AudioContext = window.AudioContext || window.webkitAudioContext;
                            const ctx = new AudioContext();
                            if (ctx.state === 'suspended') ctx.resume();
                        } catch (e) { }
                    }
                    this.triggerReaction(reactions, data);
                }
            });

            // 2. 시스템 명령어 반응 (슬래시 명령어 등)
            this.socket.on('system_command', (data) => {
                console.log("[SocketSync] System Command received:", data);

                // [v4.1.0] Phase 2: Bridge to Iframe widgets via MessageBroker
                if (window.messageBroker) {
                    window.messageBroker.broadcast('SYSTEM_EVENT', data);
                }

                const reactions = [];

                // [v2.9.4] 알람 발생 시 음성 출력 및 동작 추가
                if (data.command === 'ALARM_TRIGGER' && data.text) {
                    reactions.push({ type: 'MOTION', alias: 'happy' });
                    reactions.push({ type: 'TTS', template: data.text });
                } else {
                    reactions.push({ type: 'EVENT', value: 'NOTIFY', message: 'Command Received', skip_tts: true });
                }

                if (reactions.length > 0) {
                    this.triggerReaction(reactions, data);
                }
            });

            // 3. 리포트 생성 반응 (이미지 카드 전송 시)
            this.socket.on('system_report', (data) => {
                console.log("[SocketSync] Tactical Report generated:", data);

                // [v4.1.0] Bridge to Iframe widgets
                if (window.messageBroker) {
                    window.messageBroker.broadcast('SYSTEM_EVENT', { command: 'SYSTEM_REPORT', ...data });
                }

                this.triggerReaction([
                    { type: 'MOTION', alias: 'happy' },
                    { type: 'SENTIMENT', value: 'OPTIMAL' },
                    { type: 'TTS', template: '분석 리포트가 생성되었습니다! 디스코드 채널로 보고서를 전송했으니 확인해 주십시오.' }
                ], data);
            });

            // 4. 유튜브 뮤직 동기화 반응 (v3.8.7)
            this.socket.on('youtube_play', (data) => {
                console.log("[SocketSync] YouTube Play event received:", data);

                // [v4.1.0] Bridge to Iframe widgets
                if (window.messageBroker) {
                    // Normalize for onSystemEvent('YOUTUBE_PLAY')
                    window.messageBroker.broadcast('SYSTEM_EVENT', { command: 'YOUTUBE_PLAY', ...data });
                }
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
            // [v3.4.6] 데이터 필드 불일치 해결을 위한 정규화 (SnakeCase -> CamelCase)
            if (data.audio_url && !data.audioUrl) data.audioUrl = data.audio_url;
            if (data.visual_type && !data.visualType) data.visualType = data.visual_type;

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
