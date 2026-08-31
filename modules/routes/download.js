const express = require('express');
const router = express.Router();
const path = require('path');
const { getSafePath, getTargetBase } = require('../smallfunctions');

router.get("/download", async (req, res, next) => {
    try {
        const type = req.query.type;
        const isComic = type === "comic";
        const targetBase = getTargetBase(type);
        const filePath = getSafePath(req.query.path, targetBase);

        if (isComic || req.query.download === "true") {
            const options = { headers: {} };
            if (isComic) {
                options.headers["Content-Type"] = "application/zip";
            }

            return res.download(filePath, path.basename(filePath), options, (err) => {
                if (err) {
                    if (res.headersSent || err.code === "ECONNRESET" || err.code === "EPIPE") return;
                    if (err.code === "ENOENT") return res.status(404).end();
                    next(err);
                }
            });
        }

        res.sendFile(filePath, { acceptRanges: true }, (err) => {
            if (err) {
                if (res.headersSent || err.code === "ECONNRESET" || err.code === "EPIPE") return;
                if (err.code === "ENOENT") return res.status(404).end();
                next(err);
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;