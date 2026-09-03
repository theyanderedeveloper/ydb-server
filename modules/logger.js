const { getDate } = require('./smallfunctions');

const requestLogger = (req, res, next) => {
    const start = Date.now();
    const originalEnd = res.end;

    res.end = function (...args) {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;

        const logMessage = `${getDate()} ${req.method}: ${req.url} - Code: ${statusCode} - Took ${duration}ms`;
        console.log(logMessage);

        originalEnd.apply(this, args);
    };
    next();
};

module.exports = { requestLogger };