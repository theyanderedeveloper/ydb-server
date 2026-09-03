const express = require('express');
const router = express.Router();
const {getDirectoryItems} = require('../list')


router.get("/list", async (req, res, next) => {
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
});

module.exports = { router };