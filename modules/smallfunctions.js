const { promisify } = require("util");
const ffprobe = promisify(require("@modernized/fluent-ffmpeg").ffprobe);
const path = require("path");
const os = require("os");
const fs = require("fs");

const baseDir = path.join(__dirname, "..");
const databaseDir = path.join(baseDir, "..", "database");
const allDirs = path.join(baseDir, "..");

const DIRS = {
    dir: baseDir,
    database: databaseDir,
    public: path.join(baseDir, "frontend"),
    files: path.join(databaseDir, "files"),
    comics: path.join(databaseDir, "comics"),
    blogs: path.join(databaseDir, "blogs"),
    cpages: path.join(databaseDir, "cpages"),
    previews: path.join(databaseDir, "previews"),
    all: allDirs,
    backup: path.join(allDirs, "backups"),
};

function getDate() {
    return `[${new Date().toLocaleString()}]`;
}
function getAllExtensions(dir, extensionsSet = new Set()) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
        console.error(`Failed to read ${dir}:`, err);
        return Array.from(extensionsSet);
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            getAllExtensions(fullPath, extensionsSet);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase().slice(1);
            if (!ext) continue;
            if (extensionsSet instanceof Set) extensionsSet.add(ext);
            else if (!extensionsSet.includes(ext)) extensionsSet.push(ext);
        }
    }
    return Array.from(extensionsSet);
}

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)}${sizes[i]}`;
};

async function isSafeToProcess(filePath) {
    try {
        const metadata = await ffprobe(filePath);
        if (metadata?.streams?.some((s) => s.codec_type === "video")) {
            return true;
        }
        console.error(`${getDate()} Detected unsafe file: ${filePath}`);
        return false;
    } catch (e) {
        console.error(`${getDate()} Error checking file ${filePath}: ${e.message}`);
        return false;
    }
}

function getTargetBase(type) {
    if (Array.isArray(type)) type = type[0];
    if (typeof type !== "string") type = "";
    if (type.toLowerCase().startsWith("cr") || type.toLowerCase().startsWith("comicr")) return DIRS.cpages;
    if (type.toLowerCase().startsWith("co")) return DIRS.comics;
    if (type.toLowerCase().startsWith("bl")) return DIRS.blogs;
    if (type.toLowerCase().startsWith("vid")) return DIRS.previews;
    return DIRS.files;
}

let cachedLocalIP = null;

function getLocalIP() {
    if (cachedLocalIP) return cachedLocalIP;

    const interfaces = os.networkInterfaces();
    for (const netInterface of Object.values(interfaces)) {
        for (const net of netInterface || []) {
            if (net && net.family === "IPv4" && !net.internal) {
                cachedLocalIP = net.address;
                return cachedLocalIP;
            }
        }
    }
    return "127.0.0.1";
}


function getSafePath(userPath, baseDir) {
    if (typeof userPath !== "string") userPath = "";

    const safeBase = fs.realpathSync(baseDir);
    let resolvedPath;
    try {
        resolvedPath = fs.realpathSync(path.join(safeBase, userPath));
    } catch (err) {
        throw err;
    }

    const inside =
        resolvedPath === safeBase || resolvedPath.startsWith(safeBase + path.sep);

    if (!inside) {
        const e = new Error("Unsafe path");
        e.status = 403;
        throw e;
    }
    return resolvedPath;
}


module.exports = {
    getTargetBase,
    isSafeToProcess,
    getDate,
    getSafePath,
    getLocalIP,
    getAllExtensions,
    formatBytes,
    DIRS,
};
