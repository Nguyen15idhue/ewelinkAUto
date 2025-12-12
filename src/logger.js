const fs = require('fs');
const path = require('path');

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, 'logs');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

let currentDate = null;
let stream = null;

function getLogPath(date = new Date()) {
    const d = date.toISOString().slice(0,10);
    return path.join(LOG_DIR, `app-${d}.log`);
}

function ensureStream() {
    const today = new Date().toISOString().slice(0,10);
    if (currentDate !== today) {
        currentDate = today;
        if (stream) stream.end();
        stream = fs.createWriteStream(getLogPath(), { flags: 'a' });
    }
    return stream;
}

function write(level, args) {
    const s = ensureStream();
    const line =
        `[${new Date().toISOString()}] [${process.pid}] [${level.toUpperCase()}] ` +
        args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') +
        '\n';
    s.write(line);
}

/* monkey patch */
['log','info','warn','error','debug'].forEach(l => {
    const orig = console[l] || console.log;
    console[l] = (...args) => {
        write(l, args);
        orig(...args);
    };
});

module.exports = { getLogPath };
