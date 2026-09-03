const fsPromises = require('fs/promises');
const path = require('path');
const { getSafePath, getTargetBase } = require('./smallfunctions');

async function getDirectoryItems(targetBase, queryPath = "") {
    const dirPath = getSafePath(queryPath, targetBase);
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

    return items;
}

module.exports = { getDirectoryItems}