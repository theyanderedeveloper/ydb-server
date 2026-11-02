const fsPromises = require("fs/promises");
const path = require("path");
const AdmZip = require("adm-zip");
const { default: pLimit } = require("p-limit");
const { getDate, DIRS } = require("./smallfunctions");

const limit = pLimit(2);
let isProcessingCPreviews = false;

const zlib = require("zlib");

const MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 128;
const MAX_ZIP_FILE_BYTES = 1024 * 1024 * 130;
const MAX_ENTRIES = 64;
const SUPPORTED_METHODS = new Set([0, 8]);

async function processCPreview(zipPath, outputDir) {
    const stats = await fsPromises.stat(zipPath);
    if (stats.size > MAX_ZIP_FILE_BYTES) {
        throw new Error(`Zip file too large: ${stats.size} > ${MAX_ZIP_FILE_BYTES}`);
    }

    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    if (entries.length > MAX_ENTRIES) {
        throw new Error(`Zip has too many entries: ${entries.length}`);
    }

    const resolvedOutput = path.resolve(outputDir);
    const fileEntries = [];
    const seenTargets = new Set();
    let declaredTotal = 0;

    for (const entry of entries) {
        if (entry.isDirectory) continue;

        const { size: declaredSize, compressedSize, method } = entry.header;

        if (typeof declaredSize !== "number" || declaredSize < 0) {
            throw new Error(`Invalid declared size for entry: ${entry.entryName}`);
        }
        declaredTotal += declaredSize;
        if (declaredTotal > MAX_UNCOMPRESSED_BYTES) {
            throw new Error("Zip declared uncompressed size exceeds limit");
        }

        if (typeof compressedSize !== "number" || compressedSize < 0 || compressedSize > MAX_UNCOMPRESSED_BYTES) {
            throw new Error(`Zip compressed entry size exceeds limit: ${entry.entryName}`);
        }

        if (!SUPPORTED_METHODS.has(method)) {
            throw new Error(`Unsupported compression method (${method}): ${entry.entryName}`);
        }

        const normalizedName = entry.entryName.replace(/\\/g, "/");

        if (
            normalizedName.startsWith("/") ||
            /^[A-Za-z]:/.test(normalizedName) ||
            normalizedName.split("/").includes("..")
        ) {
            throw new Error(`Unsafe zip entry: ${entry.entryName}`);
        }

        const targetPath = path.resolve(resolvedOutput, normalizedName);
        const rel = path.relative(resolvedOutput, targetPath);
        if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
            throw new Error(`Unsafe zip entry: ${entry.entryName}`);
        }

        if (seenTargets.has(targetPath)) {
            throw new Error(`Duplicate zip entry target: ${entry.entryName}`);
        }
        seenTargets.add(targetPath);

        fileEntries.push({ entry, targetPath });
    }

    await fsPromises.mkdir(resolvedOutput, { recursive: true });

    let realOutput;
    try {
        realOutput = await fsPromises.realpath(resolvedOutput);
    } catch (err) {
        throw new Error(`Cannot resolve output directory: ${err.message}`);
    }
    if (realOutput !== resolvedOutput) {
        throw new Error(`Output directory is a symlink: ${resolvedOutput} -> ${realOutput}`);
    }

    let actualTotal = 0;

    for (const { entry, targetPath } of fileEntries) {
        const remaining = MAX_UNCOMPRESSED_BYTES - actualTotal;
        if (remaining <= 0) {
            throw new Error("Zip uncompressed size exceeds limit");
        }

        const compressed = entry.getCompressedData();
        let data;

        if (entry.header.method === 0) {
            if (compressed.length > remaining) {
                throw new Error("Zip uncompressed size exceeds limit");
            }
            data = compressed;
        } else {
            try {
                data = zlib.inflateRawSync(compressed, { maxOutputLength: remaining });
            } catch (err) {
                if (err && err.code === "ERR_BUFFER_TOO_LARGE") {
                    throw new Error("Zip uncompressed size exceeds limit");
                }
                throw err;
            }
        }

        actualTotal += data.length;

        const parentDir = path.dirname(targetPath);
        await fsPromises.mkdir(parentDir, { recursive: true });

        let realParent;
        try {
            realParent = await fsPromises.realpath(parentDir);
        } catch (err) {
            throw new Error(`Cannot resolve parent of ${targetPath}: ${err.message}`);
        }
        if (realParent !== parentDir) {
            throw new Error(`Parent path contains a symlink: ${parentDir} -> ${realParent}`);
        }

        const parentRel = path.relative(realOutput, realParent);
        if (parentRel.startsWith("..") || path.isAbsolute(parentRel)) {
            throw new Error(`Symlinked parent escapes output dir: ${parentDir} -> ${realParent}`);
        }
        try {
            await fsPromises.writeFile(targetPath, data, { flag: "wx" });
        } catch (err) {
            if (err.code === "EEXIST") {
                throw new Error(`Refusing to write to existing path (possible symlink): ${targetPath}`);
            }
            throw err;
        }
    }
}


async function processAllCPreviews() {
    if (isProcessingCPreviews) {
        console.log(`${getDate()} Previous comic extraction still running. Skipping this interval.`);
        return;
    }

    isProcessingCPreviews = true;
    console.log(`${getDate()} Processing comic files on the server...`);

    async function walk(dir) {
        const entries = await fsPromises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (
                !entry.isDirectory() &&
                (entry.name === "style.css" || entry.name === "background.mp4" || entry.name === "data.json")
            ) {
                continue;
            }

            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                try {
                    await walk(fullPath);
                } catch (e) {
                    console.error(`${getDate()} Skipping ${fullPath}:`, e.message);
                }
            } else {
                try {
                    const relativePath = path.relative(DIRS.comics, fullPath);
                    const parsed = path.parse(relativePath);
                    const previewDirPath = path.join(DIRS.cpages, parsed.dir, parsed.base);

                    let previewExists = true;
                    try {
                        await fsPromises.access(previewDirPath);
                    } catch {
                        previewExists = false;
                    }

                    if (!previewExists) {
                        await limit(async () => {
                            console.log(`${getDate()} Generating comic previews for: ${relativePath}`);
                            try {
                                await fsPromises.mkdir(previewDirPath, { recursive: true });
                                await processCPreview(fullPath, previewDirPath);
                            } catch (err) {
                                console.log(`${getDate()} Error processing comic "${entry.name}": ${err}`);
                                await fsPromises.rmdir(previewDirPath, { recursive: true });
                            }
                            console.log(`${getDate()} Finished generating comic previews for: ${relativePath}`);
                        });
                    }
                } catch (fileErr) {
                    console.error(`${getDate()} Error processing comic "${entry.name}": ${fileErr}`);
                }
            }
        }
    }

    try {
        await walk(DIRS.comics);
        console.log(`${getDate()} Background comic preview generation finished.`);
    } catch (err) {
        console.error(`${getDate()} Error during background task walk:`, err);
    } finally {
        isProcessingCPreviews = false;
    }
}

module.exports = { processAllCPreviews, processCPreview };
