const { getDate, formatBytes } = require("./smallfunctions");

const requestLogger = (req, res, next) => {
    const start = process.hrtime.bigint();

    let responseSize = 0;
    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function (chunk, encoding, callback) {
        if (chunk) {
            responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
        }
        return originalWrite.call(this, chunk, encoding, callback);
    };

    res.end = function (chunk, encoding, callback) {
        if (chunk) {
            responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
        }
        return originalEnd.call(this, chunk, encoding, callback);
    };

    res.on("finish", () => {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
        
        const reqSize = parseInt(req.get("content-length") || 0, 10);
        const resSize = responseSize || parseInt(res.get("content-length") || 0, 10);

        console.log(
            `${getDate()} ${req.method}: ${req.originalUrl} - Code: ${res.statusCode} - Took ${duration.toFixed(2)}ms - In: ${formatBytes(reqSize)} - Out: ${formatBytes(resSize)}`
        );
    });

    next();
};

module.exports = { requestLogger };