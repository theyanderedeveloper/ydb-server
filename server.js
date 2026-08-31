const express = require("express");
const fsPromises = require("fs/promises");
const path = require("path");
const fs = require('fs');

const { requestLogger } = require("./modules/logger");
const { helmetMiddleware } = require("./modules/security");
const { processAllPreviews } = require("./modules/mediaConverters");
const { getDate, getLocalIP, getAllExtensions } = require("./modules/smallfunctions");

const app = express();
const PORT = 8645;

app.disable('x-powered-by');
app.use(helmetMiddleware);
app.use(requestLogger);
app.set("trust proxy", 1);

const DIR = __dirname;

const DATABASE_DIR = path.join(DIR, 'public');
const PUBLIC_DIR = path.join(DATABASE_DIR, 'pages');
const FILES_DIR = path.join(DATABASE_DIR, 'files');
const COMICS_DIR = path.join(DATABASE_DIR, 'comics');
const PREVIEWS_DIR = path.join(DATABASE_DIR, 'previews');
const VIEWS_DIR = path.join(DATABASE_DIR, 'previews');

app.set('view engine', 'ejs');
app.set('views', VIEWS_DIR);

app.use(express.urlencoded({ extended: true }));

const publicExtensions = getAllExtensions(PUBLIC_DIR);

app.get('/search/files*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'search', 'files.html'));
});

app.get('/search/comics*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'search', 'comics.html'));
});
app.use(express.static(PUBLIC_DIR, { extensions: publicExtensions }));

app.use('/download', express.static(FILES_DIR));

app.use("/previews", express.static(PREVIEWS_DIR));


app.get('/', (req, res) => {
    fs.readdir(FILES_DIR, { withFileTypes: true }, (err, entries) => {
        if (err) {
            return res.status(500).send('Unable to scan file directory.');
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

        res.render('index', { files });
    });
});

app.use((err, req, res, next) => {
    console.error(`${getDate()} Server Error:`, err.stack);
    if (res.headersSent) return;
    res.status(err.status || 500).end();
});

app.listen(PORT, "0.0.0.0", async () => {
    console.log(`${getDate()} Server running on port http://${getLocalIP()}:${PORT}`);
    await fsPromises.mkdir(PUBLIC_DIR, { recursive: true });
    await fsPromises.mkdir(FILES_DIR, { recursive: true });
    await fsPromises.mkdir(COMICS_DIR, { recursive: true });
    await fsPromises.mkdir(PREVIEWS_DIR, { recursive: true });

    processAllPreviews();
    setInterval(processAllPreviews, 30 * 60 * 1000);
});