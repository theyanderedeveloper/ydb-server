const express = require('express');
const router = express.Router();
const fsPromises = require('fs/promises');
const path = require('path');
const { getSafePath, getTargetBase } = require('../smallfunctions');

router.get("/list", async (req, res, next) => {
    try {
        const targetBase = getTargetBase(req.query.type);
        const dirPath = getSafePath(req.query.path || "", targetBase);

        const files = await fsPromises.readdir(dirPath, { withFileTypes: true });
        const relativeDir = path.relative(targetBase, dirPath);

        const items = await Promise.all(
            files
                .filter(file => !file.name.startsWith(".") && !file.name.startsWith("--") && file.name !== "previews")
                .map(async (file) => {
                    const fullPath = path.join(dirPath, file.name);
                    const fileStats = await fsPromises.stat(fullPath).catch(() => ({
                        birthtime: null,
                        mtime: null,
                        size: 0
                    }));
                    const isDir = file.isDirectory();

                    return {
                        name: file.name,
                        type: isDir ? "dir" : "file",
                        path: path.join(relativeDir, file.name).replace(/\\/g, "/"),
                        createdAt: fileStats.birthtime ? fileStats.birthtime.getTime() : null,
                        updatedAt: fileStats.mtime ? fileStats.mtime.getTime() : null,
                        size: isDir ? 0 : fileStats.size,
                    };
                })
        );

        res.json(items);
    } catch (err) {
        if (err.code === "ENOENT" || err.code === "ENOTDIR") {
            return res.status(404).end();
        }
        next(err);
    }
});

module.exports = router;