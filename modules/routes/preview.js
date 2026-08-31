const express = require('express');
const router = express.Router();
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { getSafePath, getTargetBase } = require('../smallfunctions');
const { generateVideoPreview } = require('../mediaConverters');

const BASE_PREVIEWS = path.resolve(__dirname, '..', '..', "previews");

router.get("/preview", async (req, res, next) => {
    try {
        const { path: relativeFilePath, res: resolution } = req.query;
        if (!resolution) return res.status(400).send("Missing resolution");

        const targetBase = getTargetBase(req.query.type);
        const srcFilePath = getSafePath(relativeFilePath, targetBase);

        const parsed = path.parse(relativeFilePath);

        const previewFolder = path.join(BASE_PREVIEWS, parsed.dir, parsed.base);
        const playlistPath = path.join(previewFolder, resolution, "preview.m3u8");

        if (!fs.existsSync(playlistPath)) {
            await fsPromises.mkdir(path.dirname(playlistPath), { recursive: true });
            await generateVideoPreview(srcFilePath, previewFolder);
        }

        res.sendFile(playlistPath);
    } catch (err) {
        next(err);
    }
});

module.exports = router;