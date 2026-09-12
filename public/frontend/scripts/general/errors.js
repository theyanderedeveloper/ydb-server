import { el } from "/scripts/general/utils";

export let errorMap;

export async function setErrorMap() {
    const safePath = encodeURIComponent(comicFullName);
    const response = await fetch(`/resources/errorMap.json`);
    if (!response.ok) {
        throw new Error(`Failed to fetch errormap: ${response.status} ${response.statusText}`);
    }
    errorMap = await response.json();
}


export function renderError(code, title, message, context="") {
    const preview = el("preview");
    if (!preview) return;

    preview.innerHTML = `
        <div class="frame">
            <div class="frameHeader">
                <span class="frameID">${code} ${title}</span>
            </div>
            <div class="frameText">
                <p>${message.replace("${context}", context)}</p>
            </div>
            <div class="frameLinkList">
                <div class="frameLinkListItem" id="btn-refresh">
                    <span>🔄 REFRESH PAGE</span>
                </div>
                <div class="frameLinkListItem" id="btn-home">
                    <span>🏠 RETURN HOME</span>
                </div>
            </div>
        </div>
    `;

    const refreshBtn = document.getElementById("btn-refresh");
    const homeBtn = document.getElementById("btn-home");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => location.reload());
    }

    if (homeBtn && typeof fetchFiles === "function") {
        homeBtn.addEventListener("click", () => fetchFiles(""));
    }
}

export function handleErrorResponse(status, context) {
    const error = errorMap[status] || { title: "Unknown Error", msg: "An unexpected error occurred." };

    renderError(status, error.title, error.msg, context);

    const previewEl = el("preview");
    if (previewEl) {
        const header = document.createElement("div");
        header.className = "preview-header";
        header.innerHTML = `<button onclick="closePreview()" class="preview-close-btn" title="Close preview">✕</button>`;

        previewEl.style.position = "relative";
        previewEl.insertBefore(header, previewEl.firstChild);
    }
}