const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

function getTodayLogPath() {
    const d = new Date().toISOString().slice(0, 10);
    return path.join(LOG_DIR, `app-${d}.log`);
}

function streamLogs(res) {
    const logFile = getTodayLogPath();

    if (!fs.existsSync(logFile)) {
        res.write(`data: ${JSON.stringify({ line: '⚠️ Chưa có log hôm nay' })}\n\n`);
        return;
    }

    let lastSize = fs.statSync(logFile).size;

    // gửi log mới mỗi 1s
    const timer = setInterval(() => {
        try {
            const stats = fs.statSync(logFile);
            if (stats.size > lastSize) {
                const stream = fs.createReadStream(logFile, {
                    start: lastSize,
                    end: stats.size
                });

                stream.on('data', chunk => {
                    const lines = chunk.toString().split('\n').filter(Boolean);
                    for (const line of lines) {
                        res.write(`data: ${JSON.stringify({ line })}\n\n`);
                    }
                });

                lastSize = stats.size;
            }
        } catch (e) {}
    }, 1000);

    res.on('close', () => {
        clearInterval(timer);
        res.end();
    });
}
function getTodayLogPath() {
    const d = new Date().toISOString().slice(0, 10);
    return path.join(LOG_DIR, `app-${d}.log`);
}

function getLastLines(limit = 200) {
    const file = getTodayLogPath();
    if (!fs.existsSync(file)) return [];

    const data = fs.readFileSync(file, 'utf8');
    const lines = data.split('\n').filter(Boolean);
    return lines.slice(-limit);
}

module.exports = {
    getLastLines,
    streamLogs 
};
