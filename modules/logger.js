const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { getDate } = require('./smallfunctions');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LATEST_LOG = path.join(LOG_DIR, 'latest.log');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

function rotateLog() {
    if (fs.existsSync(LATEST_LOG)) {
        fs.promises.stat(LATEST_LOG).then(stats => {
            const dateString = new Date(stats.birthtime).toISOString().replace(/[:.]/g, '-');
            const archiveName = path.join(LOG_DIR, `${dateString}.log.gz`);
            const gzip = zlib.createGzip();
            const source = fs.createReadStream(LATEST_LOG);
            const destination = fs.createWriteStream(archiveName);

            pipeline(source, gzip, destination, (err) => {
                if (!err) fs.unlinkSync(LATEST_LOG);
            });
        }).catch(console.error);
    }
}

rotateLog();

const originalStdoutWrite = process.stdout.write;
const logStream = fs.createWriteStream(LATEST_LOG, { flags: 'a' });

const combinedLog = (data, ...args) => {
    logStream.write(data, ...args);
    originalStdoutWrite.apply(process.stdout, [data, ...args]);
};

process.stdout.write = process.stderr.write = combinedLog;



const requestLogger = (req, res, next) => {
    const start = Date.now();
    const originalEnd = res.end;

    res.end = function (...args) {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const ip = (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/, '');

        const logMessage = `${getDate()} ${req.method} ${req.url} - ${statusCode} - ${duration}ms - IP: ${ip}`;
        console.log(logMessage);

        originalEnd.apply(this, args);
    };
    next();
};

module.exports = { requestLogger };