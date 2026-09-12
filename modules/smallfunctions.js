const { promisify } = require("util");
const ffprobe = promisify(require("fluent-ffmpeg").ffprobe);
const path = require("path");
const os = require("os");
const fs = require("fs");
const { publicDecrypt } = require("crypto");

const BASE_FILES = path.resolve(__dirname, "..", "files");
const BASE_COMICS = path.resolve(__dirname, "..", "comics");

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

const DIR = path.join(__dirname, "..");

const DATABASE_DIR = path.join(DIR, "public");
const PUBLIC_DIR = path.join(DATABASE_DIR, "frontend");
const FILES_DIR = path.join(DATABASE_DIR, "files");
const COMICS_DIR = path.join(DATABASE_DIR, "comics");
const BLOGS_DIR = path.join(DATABASE_DIR, "blogs");
const CPAGES_DIR = path.join(DATABASE_DIR, "cpages");
const PREVIEWS_DIR = path.join(DATABASE_DIR, "previews");



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
        if (type.toLowerCase().startsWith("cr") || type.toLowerCase().startsWith("comicr")) return CPAGES_DIR;
        if (type.toLowerCase().startsWith("co")) return COMICS_DIR;
        if (type.toLowerCase().startsWith("bl")) return BLOGS_DIR;
        if (type.toLowerCase().startsWith("vid")) return PREVIEWS_DIR;
    }
    return FILES_DIR;
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


module.exports = { getTargetBase, isSafeToProcess, getDate, getSafePath, getLocalIP, getAllExtensions, formatBytes, DIR, DATABASE_DIR, PUBLIC_DIR, FILES_DIR, COMICS_DIR, BLOGS_DIR, CPAGES_DIR, PREVIEWS_DIR };
