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
