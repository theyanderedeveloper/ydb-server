import { FileManConfig, iconMap, EXT } from "/scripts/fileSearcher/config";
import { el, escapeHTML } from "/scripts/fileSearcher/utils";
import { renderList } from "/scripts/fileSearcher/fileManager";
import { injectMediaControls, loadVideo } from "/scripts/fileSearcher/videoPlayer";

export function closePreview() {
    FileManConfig.currentPreviewPath = null;
    const previewEl = el("preview");
    if (previewEl) previewEl.innerHTML = '<div id="content">Select a file from the sidebar.</div>';

    const currentDir = FileManConfig.currentPath || "";
    window.history.pushState({ path: currentDir }, "", currentDir ? `/search/files/${currentDir}` : "/search/files");
    renderList(FileManConfig.cachedItems, FileManConfig.currentPath);
}
window.closePreview = closePreview;

const setPreviewHTML = (html) => {
    const previewEl = el("preview");
    if (previewEl) previewEl.innerHTML = html;
};

const wrapPreview = (innerHtml, filename = "") => setPreviewHTML(`
    <div class="preview-header">
        <h2 class="media-header-style">${escapeHTML(decodeURI(filename))}</h2>
        <button onclick="closePreview()" class="preview-close-btn" title="Close preview">✕</button>
    </div>
    <div class="preview-body">${innerHtml}</div>
`);

export async function showPreview(filePath) {
    FileManConfig.currentPreviewPath = "files/" + filePath;
    const ext = filePath.split(".").pop().toLowerCase();
    const filename = filePath.split("/").pop();
    const downloadUrl = `/download/${encodeURIComponent(filePath)}`;

    window.history.pushState({ path: filePath }, "", `/search/files/${filePath}`);
    renderList(FileManConfig.cachedItems, FileManConfig.currentPath);

    try {
        if (EXT.image.has(ext)) {
            return wrapPreview(`
                <img src="${downloadUrl}" class="preview-image" onerror="handleErrorResponse(404, '${filePath}')">
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                </div>
            `, filename);
        }
        
        if (EXT.video.has(ext)) {
            wrapPreview(`
                <video controls class="preview-video" id="video-player" preload="metadata"></video>
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download (Unedited) File</a>
                </div>
            `, filename);
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
            const res = await fetch(downloadUrl);
            if (!res.ok) return window.handleErrorResponse(res.status, filePath);

            const localMediaUrl = URL.createObjectURL(await res.blob());
            wrapPreview(`
                <div class="preview-audio-container">
                    <div class="preview-audio-icon">${iconMap[ext] || "🎵"}</div>
                    <p class="preview-audio-label">Audio stream: ${ext.toUpperCase()}</p>
                    <audio controls src="${localMediaUrl}" class="preview-audio-player"></audio>
                </div>
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                </div>
            `, filename);

            const oldClose = window.closePreview;
            window.closePreview = () => {
                URL.revokeObjectURL(localMediaUrl);
                if (oldClose) oldClose();
            };
            return;
        }

        if (ext === "pdf") {
            return wrapPreview(`
                <embed src="${downloadUrl}" type="application/pdf" class="preview-pdf" />
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                </div>
            `, filename);
        }

        if (EXT.text.has(ext) || ext === "md" || ["md", "markdown", "rmd", "qmd"].includes(ext)) {
            const res = await fetch(downloadUrl);
            if (!res.ok) return window.handleErrorResponse(res.status, filePath);

            const text = await res.text();
            const isMd = ["md", "markdown", "rmd", "qmd"].includes(ext);
            const content = (isMd && typeof marked !== "undefined")
                ? `<div class="markdown-body preview-markdown">${marked.parse(text)}</div>`
                : `<pre class="preview-text">${escapeHTML(text)}</pre>`;
            return wrapPreview(`
                ${content}
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                </div>
            `, filename);
        }

        const typeLabel = EXT.archive.has(ext) ? "Archive Package" : EXT.document.has(ext) ? "Document" : `${ext.toUpperCase()} File`;
        wrapPreview(`
            <div class="preview-unknown-container">
                <div class="preview-unknown-icon">${iconMap[ext] || "📄"}</div>
                <h3 class="preview-unknown-h3">${typeLabel}</h3>
                <p class="preview-unknown-p">No live preview available for this format.</p>
                <code class="preview-unknown-path">Path: /${filePath}</code>
                <div class="preview-unknown-wrapper">
                    <a href="${downloadUrl}" download="${filename}" class="download-button">Download File</a>
                </div>
            </div>
        `, filename);

    } catch (e) {
        console.error("Preview Error:", e);
        window.renderError("500", "READ ERROR", "Failed to stream file content.");
    }
}