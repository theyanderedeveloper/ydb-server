const path = require("path");
const { getTargetBase } = require("./smallfunctions");
const { getDirectoryItems } = require("./list");

function downloadApi(req, res, next) {
    const targetBase = getTargetBase(req.query.type);
    const rawSubPath = req.params[0] || "";

    let decodedPath;
    try {
        decodedPath = decodeURIComponent(rawSubPath);
    } catch (e) {
        return res.status(400).end();
    }

    const safePath = path.join(targetBase, decodedPath);

    if (!safePath.startsWith(targetBase)) {
        return res.status(403).end();
    }

    res.sendFile(safePath, (err) => {
        if (err) {
            next();
        }
    });
}

async function listApi(req, res, next) {
    try {
        const targetBase = getTargetBase(req.query.type);
        const items = await getDirectoryItems(targetBase, req.query.path || "");
        res.json(items);
    } catch (err) {
        if (err.code === "ENOENT" || err.code === "ENOTDIR") {
            return res.status(404).end();
        }
        next(err);
    }
}

module.exports = { downloadApi, listApi };