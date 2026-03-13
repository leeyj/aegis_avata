/**
 * AEGIS Tactical Logger
 * Remote Logger - 콘솔 내용을 파일로 저장하기 위해 서버로 전송
 */
const RemoteLogger = {
    buffer: [],
    timer: null,
    info: (msg) => RemoteLogger.add(msg, 'INFO'),
    warn: (msg) => RemoteLogger.add(msg, 'WARN'),
    error: (msg, error) => {
        let text = typeof msg === 'object' ? JSON.stringify(msg) : msg;
        if (error) text += ` | EXCEPTION: ${error.message}\n${error.stack}`;
        RemoteLogger.add(text, 'ERROR');
    },
    add: (msg, level) => {
        // [v4.2.11] 중앙 집중식 로그 레벨 관리 (log_lv)
        const logLv = window.AEGIS_LOG_LV || 'info';
        
        // 레벨 필터링 로직
        if (logLv === 'none') return;
        if (logLv === 'critical' && level !== 'ERROR') return;
        if (logLv === 'info' && (level === 'DEBUG')) return; // INFO 레벨에서는 DEBUG 제외
        // 'all' 레벨은 모든 로그 통과

        // 기존 test_mode 조건도 하위 호환성을 위해 유지 (단, logLv가 'all'이면 강제 출력)
        if (window.AEGIS_TEST_MODE === false && logLv !== 'all') return;

        let text = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
        RemoteLogger.buffer.push({ message: text, level: level });

        // 3초마다 몰아서 전송하도록 타이머 설정
        if (!RemoteLogger.timer) {
            RemoteLogger.timer = setTimeout(() => {
                const logsToSend = RemoteLogger.buffer;
                RemoteLogger.buffer = [];
                RemoteLogger.timer = null;

                if (logsToSend.length === 0) return;

                fetch('/save_log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ logs: logsToSend })
                }).catch(e => { });
            }, 3000);
        }
    }
};

window.logger = RemoteLogger;
