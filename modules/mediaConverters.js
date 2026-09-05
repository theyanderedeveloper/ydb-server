const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const pLimit = require("p-limit");
const { isSafeToProcess } = require("./smallfunctions");
const { getDate } = require("./smallfunctions");

const DIR = path.resolve(__dirname, "..", "public")
const BASE_FILES = path.resolve(DIR, "files");
const BASE_PREVIEWS = path.resolve(DIR, "previews");
const limit = pLimit(1);


async function generateVideoPreview(filePath, outputFolder) {
    await limit(async () => {
        try {
            const RESOLUTIONS = [
                { name: "unedited", height: "source", bitrate: "0" },
                { name: "360p", height: 360, bitrate: "1400k" },
                { name: "720p", height: 720, bitrate: "5000k" },
                { name: "1080p", height: 1080, bitrate: "8000k" },
            ];
            for (const res of RESOLUTIONS) {
                const resFolder = path.join(outputFolder, res.name);
                await fsPromises.mkdir(resFolder, { recursive: true });

                const isRaw = res.name === "unedited";

                await new Promise((resolve, reject) => {
                    let cmd = ffmpeg(filePath);

                    if (isRaw) {
                        cmd.outputOptions(["-c", "copy", "-hls_time", "15", "-hls_list_size", "0", "-f", "hls"]);
                    } else {
                        cmd.outputOptions([
                            "-sws_flags", "fast_bilinear",
                            "-vf", `scale=-2:${res.height}`,
                            "-c:v", "libx264", "-b:v", res.bitrate,
                            "-profile:v", "baseline", "-level", "3.0",
                            "-hls_time", "15",
                            "-hls_list_size", "0",
                            "-f", "hls",
                            "-preset", "fast",
                        ]);
                    }

                    cmd.output(path.join(resFolder, "preview.m3u8"))
                        .on("end", resolve)
                        .on("error", reject)
                        .run();
                });
            }
            const masterContent = [
                "#EXTM3U",
                ...RESOLUTIONS.map(res =>
                    `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(res.bitrate) * 1000},RESOLUTION=x${res.height}\n${res.name}/preview.m3u8`
                )
            ].join("\n");

            await fsPromises.writeFile(path.join(outputFolder, "master.m3u8"), masterContent);
        }
        catch (err) {
            console.log(err);
        }
    });
}

let isProcessingPreviews = false;

async function processAllPreviews() {
    if (isProcessingPreviews) {
        console.log(`${getDate()} Previous preview generation still running. Skipping this interval.`);
        return;
    }

    isProcessingPreviews = true;
    console.log(`${getDate()} Processing video files on the server...`);

    const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm"]);

    async function walk(dir) {
        const entries = await fsPromises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else {
                const ext = path.extname(entry.name).toLowerCase();

                if (VIDEO_EXTENSIONS.has(ext)) {
                    try {
                        const relativePath = path.relative(BASE_FILES, fullPath);
                        const safe = await isSafeToProcess(fullPath);
                        
                        if (!safe) {
                            console.log(`${getDate()} Skipping dangerous video: ${entry.name}`);
                            continue;
                        }

                        const parsed = path.parse(relativePath);
                        const previewDirPath = path.join(BASE_PREVIEWS, parsed.dir, parsed.base);

                        let previewExists = true;
                        try {
                            await fsPromises.access(previewDirPath);
                        } catch {
                            previewExists = false;
                        }

                        if (!previewExists) {
                            console.log(`${getDate()} Generating previews for: ${relativePath}`);
                            await fsPromises.mkdir(previewDirPath, { recursive: true });
                            await generateVideoPreview(fullPath, previewDirPath);
                            console.log(`${getDate()} Finished generating previews for: ${relativePath}`);
                        }
                    } catch (fileErr) {
                        console.error(`${getDate()} Error processing file ${entry.name}:`, fileErr);
                    }
                }
            }
        }
    }

    try {
        await walk(BASE_FILES);
        console.log(`${getDate()} Background preview generation finished.`);
    } catch (err) {
        console.error(`${getDate()} Error during background task walk:`, err);
    } finally {
        isProcessingPreviews = false;
    }
}

module.exports = { generateVideoPreview, processAllPreviews };