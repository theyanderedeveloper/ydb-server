const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const AdmZip = require("adm-zip");
const pLimit = require("p-limit");
const { getDate } = require("./smallfunctions");

const DIR = path.resolve(__dirname, "..", "public");
const BASE_COMICS = path.resolve(DIR, "comics");
const BASE_PREVIEWS = path.resolve(DIR, "cpages");

const limit = pLimit(2);
let isProcessingCPreviews = false;

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
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await walk(fullPath);
            } else {
                try {
                    const relativePath = path.relative(BASE_COMICS, fullPath);
                    const parsed = path.parse(relativePath);
                    const previewDirPath = path.join(BASE_PREVIEWS, parsed.dir, parsed.base);

                    let previewExists = true;
                    try {
                        await fsPromises.access(previewDirPath);
                    } catch {
                        previewExists = false;
                    }

                    if (!previewExists) {
                        await limit(async () => {
                            console.log(`${getDate()} Generating previews for: ${relativePath}`);
                            await fsPromises.mkdir(previewDirPath, { recursive: true });

                            console.log(`${getDate()} Extracting archive: ${relativePath} -> ${previewDirPath}`);
                            const zip = new AdmZip(fullPath);
                            zip.extractAllTo(previewDirPath, true);
                            console.log(`${getDate()} Finished extracting: ${relativePath}`);
                        });
                    }
                } catch (fileErr) {
                    console.error(`${getDate()} Error processing file ${entry.name}:`, fileErr);
                }
            }
        }
    }

    try {
        await walk(BASE_COMICS);
        console.log(`${getDate()} Background comic preview generation finished.`);
    } catch (err) {
        console.error(`${getDate()} Error during background task walk:`, err);
    } finally {
        isProcessingCPreviews = false;
    }
}

module.exports = { processAllCPreviews };