/**
 * AEGIS External API Manager
 * 외부 AI(Ollama, OpenClaw 등)로부터 수신된 명령을 실시간으로 처리합니다.
 * ProactiveAgent와 분리되어 독립적인 폴링 루프를 가집니다.
 */

window.ExternalAPIManager = {
    pollInterval: 2000, // 2초마다 외부 이벤트 확인
    processedEventIds: new Set(),
    isPolling: false,

    /**
     * 외부 AI 연동 매니저 시작
     */
    init: function () {
        if (this.isPolling) return;
        this.isPolling = true;

        if (window.logger) window.logger.info("[ExternalAPI] Manager initialized.");

        // 폴링 시작
        this.startPolling();
    },

    /**
     * 서버로부터 새 이벤트를 가져오는 루프
     */
    startPolling: async function () {
        while (this.isPolling) {
            try {
                const response = await fetch('/api/v1/external/events');
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === "success" && data.events) {
                        this.processEvents(data.events);
                    }
                }
            } catch (error) {
                // 연결 오류 시 조용히 넘어가고 다음 루프 시도
            }

            // 지정된 간격만큼 대기
            await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        }
    },

    /**
     * 수신된 중복되지 않은 이벤트들을 실행
     */
    processEvents: function (events) {
        // 타임스탬프 순으로 정렬 (큐 구조이므로 기본적으로 정렬되어 있음)
        events.forEach(event => {
            if (!this.processedEventIds.has(event.id)) {
                this.executeEvent(event);
                this.processedEventIds.add(event.id);

                // 메모리 관리를 위해 처리된 ID 셋의 크기 제한
                if (this.processedEventIds.size > 100) {
                    const iterator = this.processedEventIds.values();
                    this.processedEventIds.delete(iterator.next().value);
                }
            }
        });
    },

    /**
     * 개별 명령 실행 (TTS 출력 및 아바타 동작)
     */
    executeEvent: function (event) {
        if (window.logger) window.logger.info(`[ExternalAPI] Executing command from ${event.source}: ${event.command}`);

        // 1. 아바타 모션/표정 실행
        if (event.motion) {
            if (typeof window.dispatchAvatarEvent === 'function') {
                window.dispatchAvatarEvent('MOTION', { alias: event.motion });
            }
        }

        // 2. TTS 음성 출력
        if (event.command === "speak" && event.audio_url) {
            if (typeof window.speakTTS === 'function') {
                // interrupt 옵션 적용 (기존 브리핑 중단 여부)
                window.speakTTS(event.text, event.audio_url, event.source, event.interrupt);
            }
        }

        // 3. 커스텀 리액션 (필요 시 ReactionEngine 연동 가능)
        if (window.reactionEngine && event.command === "action") {
            window.reactionEngine.checkAndTrigger('external', event, 0);
        }
    }
};

/**
 * 초기화 함수 (widgets.js 등에서 호출)
 */
function initExternalAPI() {
    window.ExternalAPIManager.init();
}

// 전역 노출
window.initExternalAPI = initExternalAPI;
