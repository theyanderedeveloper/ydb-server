const fs = require("fs");
const path = require("path");
const archiverPkg = require("archiver");
const { getDate, DIRS } = require("./smallfunctions");

async function createABackup() {
    try {
        const backupDir = DIRS.backup

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const safeDateName = getDate().replace(/[\/:\s,]+/g, "-").replace(/-+/g, "-").replace("[", "").replace("]", "");
        const backupFileName = `${safeDateName}.zip`;
        const backupPath = path.join(backupDir, backupFileName);

        const output = fs.createWriteStream(backupPath);

        let archive;
        const ZipArchive = archiverPkg.ZipArchive || archiverPkg.default?.ZipArchive;
        if (ZipArchive) {
            archive = new ZipArchive({ zlib: { level: 9 } });
        } else if (typeof archiverPkg === "function") {
            archive = archiverPkg("zip", { zlib: { level: 9 } });
        } else if (archiverPkg.default && typeof archiverPkg.default === "function") {
            archive = archiverPkg.default("zip", { zlib: { level: 9 } });
        } else {
            throw new Error(getDate, " Could not initialize archiver instance.");
        }

        await new Promise((resolve, reject) => {
            output.on("close", () => resolve());
            archive.on("error", (err) => reject(err));

            archive.pipe(output);

            const directoriesToBackup = [
                { dir: DIRS.files, name: "files" },
                { dir: DIRS.comics, name: "comics" },
                { dir: DIRS.blogs, name: "blogs" }
            ];

            for (const item of directoriesToBackup) {
                if (item.dir && fs.existsSync(item.dir)) {
                    archive.directory(item.dir, item.name);
                }
            }

            archive.finalize();
        });

        rotateBackups(backupDir);

        console.log(`${getDate} saved backup to ${backupPath}`);
    } catch (error) {
        console.error(getDate, " Backup failed:", error);
    }
}

function rotateBackups(backupDir) {
    try {
        if (!fs.existsSync(backupDir)) return;

        const files = fs.readdirSync(backupDir)
            .filter((file) => file.endsWith(".zip"))
            .map((file) => ({
                name: file,
                path: path.join(backupDir, file),
                time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length >= 5) {
            const filesToDelete = files.slice(4);
            for (const file of filesToDelete) {
                fs.unlinkSync(file.path);
            }
        }
    } catch (error) {
        console.error(getDate, " Backup rotation failed:", error);
    }
}

module.exports = { createABackup };