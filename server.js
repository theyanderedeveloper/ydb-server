const express = require("express");
const fsPromises = require("fs/promises");
const path = require("path");

const { helmetMiddleware } = require("./modules/security");
const { requestLogger } = require("./modules/logger");
const { getDate, getLocalIP, getAllExtensions, DIRS } = require("./modules/smallfunctions");
const { processAllPreviews } = require("./modules/mediaConverters");
const { processAllCPreviews } = require("./modules/comicConverter");
const { downloadApi, listApi } = require("./modules/apis");
const { createABackup } = require("./modules/makeABackup");

const app = express();
const PORT = process.env.PORT || 8645;

app.disable("x-powered-by");

app.use(helmetMiddleware);

app.set("trust proxy", 1);

app.use(requestLogger);
app.use(express.urlencoded({ extended: true }));

const publicExtensions = getAllExtensions(DIRS.all);

const searchPages = ["files", "comics"];

searchPages.forEach((page) => {
    app.get(`/search/${page}*`, (req, res) => {
        res.sendFile(path.join(DIRS.public, "search", `${page}.html`));
    });
});

app.use(express.static(DIRS.public, { extensions: publicExtensions }));
app.get("/download/*", downloadApi);
app.use("/list", listApi);

app.use((req, res) => {
    res.status(404).sendFile(path.join(DIRS.database, "404.html"), (err) => {
        if (err) res.status(404).end("Not Found");
    });
});

app.use((err, req, res, next) => {
    console.error(`${getDate()} Server Error:`, err.stack);
    if (res.headersSent) return;
    res.status(err.status || 500).end();
});

async function startServer() {
    try {
        await Promise.all(
            Object.values(DIRS).map(async (directory) => {
                try {
                    await fsPromises.mkdir(directory, { recursive: true });
                } catch (e) {
                    console.error(`${getDate()} Error creating directory ${directory}:`, e);
                    throw e;
                }
            }),
        );

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`${getDate()} Server running on http://${getLocalIP()}:${PORT}`);

            processAllPreviews();
            processAllCPreviews();
            createABackup();

            setInterval(processAllPreviews, 30 * 60 * 1000);
            setInterval(processAllCPreviews, 30 * 60 * 1000);
            setInterval(createABackup, 3 * 24 * 60 * 60 * 1000);
        });
    } catch (error) {
        console.error(`${getDate()} Failed to start server:`, error);
        process.exit(1);
    }
}

await startServer();