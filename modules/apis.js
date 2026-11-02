const fsPromises = require("fs").promises;
const path = require("path");
const { getTargetBase } = require("./smallfunctions");
const { getDirectoryItems } = require("./list");

async function downloadApi(req, res, next) {
    const targetBase = getTargetBase(req.query.type);
    const rawPath = req.params[0] || "";

    let safeBase;
    let safePath;

    try {
        safeBase = await fsPromises.realpath(targetBase);
        safePath = await fsPromises.realpath(path.join(safeBase, rawPath));
    } catch (err) {
        if (err.code === "ENOENT" || err.code === "ENOTDIR" || err.code === "ELOOP") {
            return next();
        }
        return next(err);
    }

    if (safePath !== safeBase && !safePath.startsWith(safeBase + path.sep)) {
        return res.status(403).end();
    }
    res.set("Cache-Control", "private, no-store");
    res.download(safePath, (err) => {
        if (!err) return;
        if (res.headersSent) return req.socket.destroy();
        next(err);
    });
}
async function listApi(req, res, next) {
    try {
        const targetBase = getTargetBase(req.query.type);
        const items = await getDirectoryItems(targetBase, req.query.path || "");
        res.json(items);
    } catch (err) {
        if (err.code === "ENOENT" || err.code === "ENOTDIR") return res.status(404).end();
        if (err.message === "Unsafe path") return res.status(403).end();
        next(err);
    }
}

module.exports = { downloadApi, listApi };
