const fsPromises = require("fs/promises");
const path = require("path");
const AdmZip = require("adm-zip");
const pLimit = require("p-limit");
const { getDate, DIRS } = require("./smallfunctions");

const limit = pLimit(4);
let isProcessingCPreviews = false;

async function processAllCPreviews() {
    if (isProcessingCPreviews) {
        console.log(`${getDate()} Previous comic extraction still running (how?). Skipping this interval.`);
        return;
    }

    isProcessingCPreviews = true;
    console.log(`${getDate()} Processing comic files on the server...`);

    async function walk(dir) {
        const entries = await fsPromises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory() && ( entry.name === "style.css" || entry.name === "background.mp4")) {
                continue;
            }

            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                await walk(fullPath);}
            else {
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
                            await fsPromises.mkdir(previewDirPath, { recursive: true });

                            const zip = new AdmZip(fullPath);
                            zip.extractAllTo(previewDirPath, true);
                            console.log(`${getDate()} Finished generating comic previews for: ${relativePath}`);
                        });
                    }
                } catch (fileErr) {
                    console.error(`${getDate()} Error processing comic "${entry.name}":`, fileErr);
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

module.exports = { processAllCPreviews };