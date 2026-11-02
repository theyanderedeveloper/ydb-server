const express = require("express");
const fsPromises = require("fs/promises");
const path = require("path");

const { helmetMiddleware } = require("./modules/security");
const { requestLogger } = require("./modules/logger");
const { getDate, getLocalIP, getAllExtensions, DIRS } = require("./modules/smallfunctions");
const { processAllPreviews } = require("./modules/mediaConverters");
const { processAllCPreviews } = require("./modules/comicConverter");
const { downloadApi, listApi } = require("./modules/apis");
//const { createABackup } = require("./modules/makeABackup");

const app = express();
const PORT = process.env.PORT || 8645;

app.disable("x-powered-by");

app.use(helmetMiddleware);

app.set("trust proxy", 1);

app.use(["/list", "/download"], (req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    next();
});

app.use(requestLogger);

app.set("query parser", "simple");
app.set("json escape", true);

let databaseExtensions = getAllExtensions(DIRS.database);
databaseExtensions = getAllExtensions(DIRS.public, databaseExtensions);

const searchPages = ["files", "comics"];

searchPages.forEach((page) => {
    // ✅ Express 5: wildcard segments must be named
    app.get([`/search/${page}`, `/search/${page}/*splat`], (req, res) => {
        res.sendFile(path.join(DIRS.public, "search", `${page}.html`));
    });
});

app.use(express.static(DIRS.public, { extensions: databaseExtensions }));

// ✅ Express 5: wildcard segments must be named
app.get("/download/*splat", downloadApi);
app.get("/list", listApi);

app.use((req, res) => {
    res.status(404).sendFile(path.join(DIRS.public, "404.html"));
});

app.use((err, req, res, next) => {
    console.error(`${getDate()} Server Error:`, err.stack);
    if (res.headersSent) return next(err);
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
            })
        );

        const server = app.listen(PORT, "127.0.0.1", () => {
            console.log(`${getDate()} Server running on http://${getLocalIP()}:${PORT}`);

            try {
                processAllPreviews();
            } catch (err) {
                console.error(`${getDate()}, Error while making previews for a videos`);
            }

            try {
                processAllCPreviews();
            } catch (err) {
                console.error(`${getDate()}, Error while making previews for comic files`);
            }

            try {
                //createABackup();
            } catch (err) {
                console.error(`${getDate()}, Error while creating a backup`);
            }

            setInterval(
                () => {
                    try {
                        processAllPreviews();
                    } catch (err) {
                        console.error(`${getDate()}, Error while making scheduled previews for a videos`);
                    }
                },
                30 * 60 * 1000
            );
            setInterval(
                () => {
                    try {
                        processAllCPreviews();
                    } catch (err) {
                        console.error(`${getDate()}, Error while making scheduled previews for comic files`);
                    }
                },
                30 * 60 * 1000
            );
            setInterval(
                () => {
                    try {
                        //createABackup();
                    } catch (err) {
                        console.error(`${getDate()}, Error while creating a scheduled backup`);
                    }
                },
                3 * 24 * 60 * 60 * 1000
            );
        });
        server.headersTimeout = 20_000;
        server.requestTimeout = 60_000;
        server.keepAliveTimeout = 5_000;
        server.maxHeadersCount = 100;
        server.on("error", (err) => {
            console.error(`${getDate()} Server error:`, err);
            process.exit(1);
        });
    } catch (error) {
        console.error(`${getDate()} Failed to start server:`, error);
        process.exit(1);
    }
}

(async () => {
    await startServer();
})();
