import { FileManConfig, iconMap, EXT } from "/scripts/fileSearcher/config";
import { el, escapeHTML } from "/scripts/general/utils";
import { renderList } from "/scripts/fileSearcher/fileManager";
import { injectMediaControls, loadVideo } from "/scripts/fileSearcher/videoPlayer";
import { handleErrorResponse } from "/scripts/general/errors";

function openHeicDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("FileManHEICCache", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("heicStore")) {
                db.createObjectStore("heicStore");
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function getCachedHeic(filePath) {
    try {
        const db = await openHeicDB();
        return new Promise((resolve) => {
            const tx = db.transaction("heicStore", "readonly");
            const store = tx.objectStore("heicStore");
            const req = store.get(filePath);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function setCachedHeic(filePath, blob) {
    try {
        const db = await openHeicDB();
        return new Promise((resolve) => {
            const tx = db.transaction("heicStore", "readwrite");
            const store = tx.objectStore("heicStore");
            store.put({ blob, timestamp: Date.now() }, filePath);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    } catch {
        return false;
    }
}

let currentHeifController = null;

export function closePreview() {
    if (currentHeifController) {
        currentHeifController.abort();
        currentHeifController = null;
    }

    FileManConfig.currentPreviewPath = null;
    const previewEl = el("preview");
    if (previewEl) previewEl.innerHTML = '<div id="content">Select a file from the sidebar.</div>';

    const currentDir = FileManConfig.currentPath || "";
    window.history.pushState(
        { path: currentDir },
        "",
        currentDir ? `/search/files/${currentDir}` : "/search/files",
    );
    renderList(FileManConfig.cachedItems, FileManConfig.currentPath);
}
window.closePreview = closePreview;

const setPreviewHTML = (html) => {
    const previewEl = el("preview");
    if (previewEl) previewEl.innerHTML = html;
};

const wrapPreview = (innerHtml, filename = "") =>
    setPreviewHTML(`
    <div class="preview-header">
        <h2 class="media-header-style">${escapeHTML(decodeURI(filename))}</h2>
        <button onclick="closePreview()" class="preview-close-btn" title="Close preview">✕</button>
    </div>
    <div class="preview-body">${innerHtml}</div>
`);

export async function showPreview(filePath) {
    if (currentHeifController) {
        currentHeifController.abort();
        currentHeifController = null;
    }

    FileManConfig.currentPreviewPath = "files/" + filePath;
    const ext = filePath.split(".").pop().toLowerCase();
    const filename = filePath.split("/").pop();
    const downloadUrl = `/download/${encodeURIComponent(filePath)}`;

    window.history.pushState({ path: filePath }, "", `/search/files/${filePath}`);
    renderList(FileManConfig.cachedItems, FileManConfig.currentPath);

    try {
        if (ext === "heic" || EXT.image.has(ext)) {
            let imageSourceUrl = downloadUrl;

            if (ext === "heic") {
                const cachedEntry = await getCachedHeic(filePath);
                const now = Date.now();

                if (cachedEntry && now - cachedEntry.timestamp < 2 * 60 * 60 * 1000) {
                    imageSourceUrl = URL.createObjectURL(cachedEntry.blob);
                } else {
                    wrapPreview(
                        `
                            <div class="preview-loading-container" style="text-align: center; padding: 40px;">
                                <p class="preview-loading-text">Converting HEIC image...</p>
                            </div>
                            <div class="preview-unknown-wrapper">
                                <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                            </div>
                        `,
                        filename,
                    );

                    currentHeifController = new AbortController();
                    const { signal } = currentHeifController;

                    try {
                        const response = await fetch(downloadUrl, { signal });
                        if (!response.ok) return handleErrorResponse(response.status, filePath);

                        const heicBlob = await response.blob();
                        if (signal.aborted) return;

                        const conversionResult = await heic2any({
                            blob: heicBlob,
                            toType: "image/jpeg",
                            quality: 0.7,
                        });

                        if (signal.aborted) return;

                        const jpegBlob = Array.isArray(conversionResult)
                            ? conversionResult[0]
                            : conversionResult;
                        
                        imageSourceUrl = URL.createObjectURL(jpegBlob);
                        
                        await setCachedHeic(filePath, jpegBlob);

                    } catch (conversionError) {
                        if (conversionError.name === "AbortError" || signal.aborted) {
                            console.log("HEIC conversion cancelled for:", filePath);
                            return;
                        }
                        console.error("HEIC Client-side conversion failed:", conversionError);
                        return wrapPreview(
                            `
                                <div class="preview-error-container" style="text-align: center; padding: 20px;">
                                    <p>Failed to convert HEIC preview.</p>
                                </div>
                                <div class="preview-unknown-wrapper">
                                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                                </div>
                            `,
                            filename,
                        );
                    } finally {
                        currentHeifController = null;
                    }
                }
            }

            return wrapPreview(
                `
                    <img src="${imageSourceUrl}" class="preview-image" onerror="handleErrorResponse(404, '${filePath}')">
                    <div class="preview-unknown-wrapper">
                        <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                    </div>
                `,
                filename,
            );
        }

        if (EXT.video.has(ext)) {
            let fileSize = 0;
            try {
                const headRes = await fetch(downloadUrl, { method: "HEAD" });
                const contentLength = headRes.headers.get("content-length");
                if (contentLength) {
                    fileSize = parseInt(contentLength, 10);
                }
            } catch (err) {
                console.warn("Could not fetch file size headers, proceeding with preview check:", err);
            }

            if (fileSize > 1024 * 1024 * 1024) {
                return wrapPreview(
                    `
                    <div class="preview-error-container" style="text-align: center; padding: 40px;">
                        <p class="preview-error-text">File exceeds max size allowed for convertation (1GB), online preview impossible</p>
                    </div>
                    <div class="preview-unknown-wrapper">
                        <a href="${downloadUrl}" download="${filename}" class="download-button">Download file</a>
                    </div>
                `,
                    filename,
                );
            }

            wrapPreview(
                `
                <video controls class="preview-video" id="video-player" preload="metadata"></video>
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download Video (original quality)</a>
                </div>
            `,
                filename,
            );

            injectMediaControls(filePath, document.getElementById("video-player"));
            loadVideo(filePath, "720p", 0);

            const oldClose = window.closePreview;
            window.closePreview = () => {
                if (window.hlsInstance) window.hlsInstance.destroy();
                if (oldClose) oldClose();
            };
            return;
        }

        if (EXT.audio.has(ext)) {
            return wrapPreview(
                `
                <div class="preview-audio-container">
                    <div class="preview-audio-icon">${iconMap[ext] || "🎵"}</div>
                    <p class="preview-audio-label">Audio stream: ${ext.toUpperCase()}</p>
                    <audio controls src="${downloadUrl}" class="preview-audio-player" preload="metadata"></audio>
                </div>
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                </div>
            `,
                filename,
            );
        }

        if (ext === "pdf") {
            return wrapPreview(
                `
                <embed src="${downloadUrl}" type="application/pdf" class="preview-pdf" />
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                </div>
            `,
                filename,
            );
        }

        if (EXT.text.has(ext) || ext === "md" || ["md", "markdown", "rmd", "qmd"].includes(ext)) {
            const res = await fetch(downloadUrl);
            if (!res.ok) return handleErrorResponse(res.status, filePath);

            const text = await res.text();
            const isMd = ["md", "markdown", "rmd", "qmd"].includes(ext);
            const content =
                isMd && typeof marked !== "undefined"
                    ? `<div class="markdown-body preview-markdown">${marked.parse(text)}</div>`
                    : `<pre class="preview-text">${escapeHTML(text)}</pre>`;

            return wrapPreview(
                `
                ${content}
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                </div>
            `,
                filename,
            );
        }

        const typeLabel = EXT.archive.has(ext)
            ? "Archive Package"
            : EXT.document.has(ext)
              ? "Document"
              : `${ext.toUpperCase()} File`;
        return wrapPreview(
            `
            <div class="preview-unknown-container">
                <div class="preview-unknown-icon">${iconMap[ext] || "📄"}</div>
                <h3 class="preview-unknown-h3">${typeLabel}</h3>
                <p class="preview-unknown-p">No live preview available for this format.</p>
                <code class="preview-unknown-path">Path: /${filePath}</code>
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                </div>
            </div>
        `,
            filename,
        );
    } catch (e) {
        console.error("Preview Error:", e);
        window.renderError("500", "READ ERROR", "Failed to stream file content.");
    }
}