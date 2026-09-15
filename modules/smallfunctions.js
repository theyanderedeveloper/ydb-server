const { promisify } = require("util");
const ffprobe = promisify(require("fluent-ffmpeg").ffprobe);
const path = require("path");
const os = require("os");
const fs = require("fs");

const baseDir = path.join(__dirname, "..");
const databaseDir = path.join(baseDir, "public");

const DIRS = {
    dir: baseDir,
    database: databaseDir,
    public: path.join(databaseDir, "frontend"),
    files: path.join(databaseDir, "files"),
    comics: path.join(databaseDir, "comics"),
    blogs: path.join(databaseDir, "blogs"),
    cpages: path.join(databaseDir, "cpages"),
    previews: path.join(databaseDir, "previews"),
};

function getDate() {
    return `[${new Date().toLocaleString()}]`;
}

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return "0B";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)}${sizes[i]}`;
}

async function isSafeToProcess(filePath) {
    try {
        const metadata = await ffprobe(filePath);
        if (metadata?.streams?.some(s => s.codec_type === "video")) {
            return true;
        }
        console.error(`${getDate()} Detected unsafe file: ${filePath}`);
        return false;
    } catch (e) {
        console.error(`${getDate()} Error checking file ${filePath}: ${e.message}`);
        return false;
    }
}



const getSafePath = (userPath, baseDir) => {
    const safeBase = path.resolve(baseDir);
    const resolvedPath = path.resolve(safeBase, decodeURIComponent(userPath));

    if (!resolvedPath.startsWith(safeBase)) {
        throw new Error("Unsafe path detected");
    }

    return resolvedPath;
};

function getTargetBase(type) {
    if (type) {
        if (type.toLowerCase().startsWith("cr") || type.toLowerCase().startsWith("comicr")) return DIRS.cpages;
        if (type.toLowerCase().startsWith("co")) return DIRS.comics;
        if (type.toLowerCase().startsWith("bl")) return DIRS.blogs;
        if (type.toLowerCase().startsWith("vid")) return DIRS.previews;
    }
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
    return "192.168.8.205";
}

function getAllExtensions(dir, extensionsSet = new Set()) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                getAllExtensions(fullPath, extensionsSet);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase().slice(1);
                if (ext) extensionsSet.add(ext);
            }
        }
    } catch {
    }
    return Array.from(extensionsSet);
}


module.exports = { getTargetBase, isSafeToProcess, getDate, getSafePath, getLocalIP, getAllExtensions, formatBytes, DIRS, };
