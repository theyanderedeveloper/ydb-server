const { getDate, formatBytes } = require("./smallfunctions");

function toBytes(chunk, encoding) {
    if (!chunk) return 0;
    if (typeof chunk === "string") {
        const enc = typeof encoding === "string" ? encoding : "utf8";
        try {
            return Buffer.byteLength(chunk, enc);
        } catch {
            return 0;
        }
    }
    if (chunk instanceof Uint8Array) return chunk.byteLength;
    if (chunk instanceof ArrayBuffer) return chunk.byteLength;
    return 0;
}

function parseSize(value) {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

const requestLogger = (req, res, next) => {
    const start = process.hrtime.bigint();

    let responseSize = 0;
    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function (chunk, encoding, callback) {
        if (typeof chunk !== "function") {
            responseSize += toBytes(chunk, encoding);
        }
        return originalWrite.call(this, chunk, encoding, callback);
    };

    res.end = function (chunk, encoding, callback) {
        if (typeof chunk !== "function") {
            responseSize += toBytes(chunk, encoding);
        }
        return originalEnd.call(this, chunk, encoding, callback);
    };

    res.on("finish", () => {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000;

        const reqSize = parseSize(req.get("content-length"));
        const resSize = responseSize || parseSize(res.get("content-length"));

        console.log(
            `${getDate()} ${req.method}: ${req.originalUrl.replace(/[\r\n\x00-\x1f\x7f]/g, "?").slice(0, 2048)} - Code: ${res.statusCode} - Took ${duration.toFixed(2)}ms - In: ${formatBytes(reqSize)} - Out: ${formatBytes(resSize)}`
        );
    });

    next();
};

module.exports = { requestLogger };
