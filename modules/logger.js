const { getDate } = require("./smallfunctions");

const requestLogger = (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
        console.log(`${getDate()} ${req.method}: ${req.url} - Code: ${res.statusCode} - Took ${duration.toFixed(2)}ms`);
    });

    next();
};

module.exports = { requestLogger };