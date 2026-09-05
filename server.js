const express = require("express");
const fsPromises = require("fs/promises");
const path = require("path");
const fs = require("fs");

const { requestLogger } = require("./modules/logger");
const { helmetMiddleware } = require("./modules/security");
const { processAllPreviews } = require("./modules/mediaConverters");
const { getDate, getLocalIP, getAllExtensions } = require("./modules/smallfunctions");
const { getDirectoryItems } = require("./modules/list");
const { processAllCPreviews } = require("./modules/comicConverter");


const app = express();
const PORT = 8645;

app.disable("x-powered-by");
app.use(helmetMiddleware);
app.set("trust proxy", 1);

app.use(requestLogger)

app.use(express.urlencoded({ extended: true }));


const DIR = __dirname;

const DATABASE_DIR = path.join(DIR, "public");
const PUBLIC_DIR = path.join(DATABASE_DIR, "frontend");
const FILES_DIR = path.join(DATABASE_DIR, "files");
const COMICS_DIR = path.join(DATABASE_DIR, "comics");
const CPAGES_DIR = path.join(DATABASE_DIR, "cpages");
const PREVIEWS_DIR = path.join(DATABASE_DIR, "previews");
const VIEWS_DIR = path.join(DATABASE_DIR, "views");

const publicExtensions = getAllExtensions(PUBLIC_DIR);


app.get("/search/files*", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "search", "files.html"));
});

app.get("/search/comics*", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "search", "comics.html"));
});

function getTargetBase(type) {
    switch (type) {
        case "comic":
        case "comics":
            return COMICS_DIR;
        case "creader":
            return CPAGES_DIR;
        case "vidprev":
            return PREVIEWS_DIR;
        default:
            return FILES_DIR;
    }
}


app.use(express.static(PUBLIC_DIR, { extensions: publicExtensions }));

app.use("/download", (req, res, next) => {
    const targetBase = getTargetBase(req.query.type);
        const safePath = path.join(targetBase, req.path);
    
    res.sendFile(safePath, (err) => {
        if (err) {
            next();
        }
    });
    console.log(safePath)
});


app.use("/previews", express.static(PREVIEWS_DIR));

app.use("/list", async (req, res, next) => {
    try {
        const targetBase = getTargetBase(req.query.type);
        const items = await getDirectoryItems(targetBase, req.query.path || "");

        res.json(items);
    } catch (err) {
        if (err.code === "ENOENT" || err.code === "ENOTDIR") {
            return res.status(404).end();
        }
        next(err);
    }
})


app.get("/", (req, res) => {
    fs.readdir(FILES_DIR, { withFileTypes: true }, (err, entries) => {
        if (err) {
            return res.status(500).send("Unable to scan file directory.");
        }

        const files = entries
            .filter(entry => entry.isFile())
            .map(file => {
                const filePath = path.join(FILES_DIR, file.name);
                const stats = fs.statSync(filePath);
                return {
                    name: file.name,
                    size: stats.size,
                    updatedAt: stats.mtime
                };
            });

        res.render("index", { files });
    });
});

app.use((err, req, res, next) => {
    console.error(`${getDate()} Server Error:`, err.stack);
    if (res.headersSent) return;
    res.status(err.status || 500).end();
});

async function startServer() {
    await fsPromises.mkdir(PUBLIC_DIR, { recursive: true });
    await fsPromises.mkdir(path.join(PUBLIC_DIR, "search"), { recursive: true });
    await fsPromises.mkdir(FILES_DIR, { recursive: true });
    await fsPromises.mkdir(COMICS_DIR, { recursive: true });
    await fsPromises.mkdir(PREVIEWS_DIR, { recursive: true });

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`${getDate()} Server running on port http://${getLocalIP()}:${PORT}`);
        processAllPreviews();
        processAllCPreviews();
        setInterval(processAllPreviews, 30 * 60 * 1000);
    });
}

startServer();