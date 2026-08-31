const { promisify } = require('util');
const ffprobe = promisify(require("fluent-ffmpeg").ffprobe);
const path = require('path');
const os = require('os');
const fs = require('fs');

const BASE_FILES = path.resolve(__dirname, '..', "files");
const BASE_COMICS = path.resolve(__dirname, '..', "comics");

function getDate() {
    return `[${new Date().toLocaleString()}]`;
}

async function isSafeToProcess(filePath) {
    try {
        const metadata = await ffprobe(filePath);
        if (metadata.streams.some(s => s.codec_type === 'video')) {
            return true;
        }
        else {
            console.error(`${getDate()} Detected unsafe file: ${filePath}:`);
            return false;
        }
    } catch (e) {
        console.error(`${getDate()} Error during checking the file: ${filePath}: ${e.message}`);
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


const getTargetBase = (type) => {
    if (type === "comic") return BASE_COMICS;
    return BASE_FILES;
};


function getLocalIP() {
    const interfaces = os.networkInterfaces();
    const match = Object.values(interfaces)
        .flat()
        .find(net => net && net.family === 'IPv4' && !net.internal);

    return match ? match.address : '192.168.8.205';
}

function getAllExtensions(dir, extensionsSet = new Set()) {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            getAllExtensions(fullPath, extensionsSet);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase().replace('.', '');
            if (ext) extensionsSet.add(ext);
        }
    }
    return Array.from(extensionsSet);
}

module.exports = { isSafeToProcess, getTargetBase, getDate, getSafePath, getLocalIP, getAllExtensions };