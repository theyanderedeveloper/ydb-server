import { FileManConfig, iconMap } from '/scripts/fileSearcher/config';
import { el, escapeHTML } from '/scripts/fileSearcher/utils';
import { renderList } from '/scripts/fileSearcher/fileManager';
import { injectMediaControls, loadVideo } from '/scripts/fileSearcher/videoPlayer';

export function closePreview() {
    FileManConfig.currentPreviewPath = null;
    const previewEl = el("preview");
    if (previewEl) previewEl.innerHTML = "";
    
    // When closing the preview, revert URL back to the directory path
    const currentDir = FileManConfig.currentPath || "";
    const newUrl = currentDir ? `/search/files/${currentDir}` : "/search/files";
    window.history.pushState({ path: currentDir }, "", newUrl);

    renderList(FileManConfig.cachedItems, FileManConfig.currentPath);
}

window.closePreview = closePreview;

function renderWithCloseButton(innerHtml) {
    const previewEl = el("preview");
    if (!previewEl) return;

    previewEl.innerHTML = `
        <div class="preview-wrapper">
            <div class="preview-header">
                <button onclick="closePreview()" class="preview-close-btn" title="Close preview">✕</button>
            </div>
            <div class="preview-content">
                ${innerHtml}
            </div>
        </div>
    `;
}

function renderMediaPreview(mediaHtml, filePath) {
    const filename = filePath.split("/").pop();
    const previewEl = el("preview");
    if (!previewEl) return;

    previewEl.innerHTML = `
    <div class="file-preview">
        <div class="preview-header">
            <button onclick="closePreview()" class="preview-close-btn" title="Close preview">✕</button>
        </div>
        <h2 class="media-header-style">${escapeHTML(filename)}</h2>
        ${mediaHtml}
        <div class="media-download-margin">
            <a href="/download?path=${encodeURIComponent(filePath)}" 
               download="${filename}" class="button">DOWNLOAD FILE</a>
        </div>
    </div>`;
}

export async function showPreview(filePath) {
    FileManConfig.currentPreviewPath = "files/" + filePath;
    const ext = filePath.split(".").pop().toLowerCase();
    const downloadUrl = `/download/${encodeURIComponent(filePath)}`;
    
    // Update URL to include the file path when opening a file preview
    const newUrl = `/search/files/${filePath}`;
    window.history.pushState({ path: filePath }, "", newUrl);

    renderList(FileManConfig.cachedItems, FileManConfig.currentPath);

    const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "tif", "tiff", "avif", "heic", "heif"].includes(ext);
    const isVideo = ["mp4", "webm", "avi", "mov", "mkv", "flv", "3gp", "3g2", "asf", "m4v", "mpeg", "mpg"].includes(ext);
    const isAudio = ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "wma", "aiff", "ac3", "dts", "ape", "au", "mid", "midi"].includes(ext);
    const isPdf = ext === "pdf";
    const isMarkdown = ["md", "markdown", "rmd", "qmd"].includes(ext);
    const isArchive = ["zip", "rar", "tar", "gz", "7z", "iso", "bz2", "xz", "msi", "deb", "rpm", "apk", "dmg", "img", "vhd"].includes(ext);
    const isDocument = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "rtf", "odt", "odp", "epub", "mobi"].includes(ext);

    const textExtensions = new Set([
        "js", "jsx", "ts", "tsx", "html", "htm", "css", "scss", "sass", "less", "vue", "svelte", "astro",
        "ejs", "pug", "jade", "haml", "twig", "njk", "liquid", "hbs", "handlebars", "mustache", "jsp",
        "aspx", "ascx", "master", "cshtml", "vbhtml", "razor", "gsp", "cfm", "cfc", "xhtml", "json",
        "jsonc", "json5", "hjson", "xml", "yaml", "yml", "toml", "env", "ini", "properties", "prop",
        "plist", "reg", "inf", "cfg", "conf", "config", "csv", "tsv", "ndjson", "proto", "textproto",
        "py", "pyi", "pyc", "pyx", "java", "class", "c", "cpp", "h", "hpp", "cs", "go", "rs", "rb",
        "php", "sh", "bash", "zsh", "fish", "ksh", "ps1", "psm1", "psd1", "bat", "cmd", "sql", "kt",
        "kts", "swift", "d", "di", "mm", "m", "cxx", "cc", "hh", "hxx", "rlib", "r", "R", "jl",
        "lua", "luac", "pl", "pm", "t", "raku", "rakumod", "vbs", "vb", "fs", "fsx", "fsi", "ml",
        "mli", "hs", "lhs", "erl", "hrl", "ex", "exs", "eex", "leex", "heex", "clj", "cljs", "cljc",
        "edn", "scala", "sc", "nim", "zig", "v", "odin", "cr", "hx", "rkt", "scm", "ss", "lisp",
        "cl", "lsp", "gleam", "roc", "wgsl", "glsl", "cu", "cuh", "hip", "sycl", "dart", "pas",
        "cob", "cbl", "ada", "adb", "ads", "asm", "s", "nasm", "awk", "sed", "vala", "vapi",
        "mojo", "elm", "txt", "log", "patch", "diff", "tex", "ltx", "bib", "ipynb",
    ]);

    let html = "";

    try {
        if (isImage) {
            html = `<img src="${downloadUrl}" class="preview-image" onerror="handleErrorResponse(404, '${filePath}')">`;
            renderMediaPreview(html, filePath);
        } else if (isVideo || isAudio) {
            try {
                if (isVideo) {
                    html = `<video controls class="preview-video" id="video-player" preload="metadata"></video>`;
                    renderMediaPreview(html, filePath);

                    const video = document.getElementById('video-player');
                    injectMediaControls(filePath, video);
                    loadVideo(filePath, '720p', 0);

                    const oldClose = window.closePreview;
                    window.closePreview = () => {
                        if (window.hlsInstance) window.hlsInstance.destroy();
                        if (oldClose) oldClose();
                    };
                    return;
                }

                const res = await fetch(downloadUrl);
                if (!res.ok) {
                    window.handleErrorResponse(res.status, filePath);
                    return;
                }
                const blob = await res.blob();
                const localMediaUrl = URL.createObjectURL(blob);

                html = `
                <div class="preview-audio-container">
                    <div class="preview-audio-icon">${iconMap[ext] || "🎵"}</div>
                    <p class="preview-audio-label">Audio stream:${ext.toUpperCase()}</p>
                    <audio controls src="${localMediaUrl}" class="preview-audio-player"></audio>
                </div>`;

                renderMediaPreview(html, filePath);

                const oldClose = window.closePreview;
                window.closePreview = () => {
                    URL.revokeObjectURL(localMediaUrl);
                    if (oldClose) oldClose();
                };

            } catch (err) {
                console.error("Media streaming failed:", err);
                window.renderError("500", "STREAM ERROR", "Failed to stream media.");
            }

        } else if (isPdf) {
            html = `<embed src="${downloadUrl}" type="application/pdf" class="preview-pdf" />`;
            renderWithCloseButton(html);
        } else if (isMarkdown || textExtensions.has(ext)) {
            const res = await fetch(downloadUrl);
            if (!res.ok) {
                window.handleErrorResponse(res.status, filePath);
                return;
            }

            const text = await res.text();
            if (isMarkdown && typeof marked !== "undefined") {
                html = `<div class="markdown-body preview-markdown">${marked.parse(text)}</div>`;
            } else {
                html = `<pre class="preview-text">${escapeHTML(text)}</pre>`;
            }
            renderWithCloseButton(html);
        } else {
            const icon = iconMap[ext] || "📄";
            const typeLabel = isArchive ? "Archive Package" : isDocument ? "Document" : `${ext.toUpperCase()} File`;
            const filename = filePath.split("/").pop();

            html = `
            <div class="preview-unknown-container">
                <div class="preview-unknown-icon">${icon}</div>
                <h3 class="preview-unknown-h3">${typeLabel}</h3>
                <p class="preview-unknown-p">No live preview available for this format.</p>
                <code class="preview-unknown-path">PATH: ${filePath}</code>
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                </div>
            </div>`;
            renderWithCloseButton(html);
        }
    } catch (e) {
        console.error("Preview Error:", e);
        window.renderError("500", "READ ERROR", "Failed to stream file content.");
    }
}