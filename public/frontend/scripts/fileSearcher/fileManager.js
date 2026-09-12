import { FileManConfig, iconMap } from "/scripts/fileSearcher/config";
import { el, formatBytes, formatDate, escapeHTML } from "/scripts/general/utils";
import { showPreview } from "/scripts/fileSearcher/previewManager";

const PROPERTY_MAP = { atime: "createdAt", mtime: "updatedAt", size: "size" };

export function sortItems(items) {
    const { sortBy, sortOrder } = FileManConfig;
    const order = sortOrder === "asc" ? 1 : -1;

    return [...items].sort((a, b) => {
        if (a.type === "dir" && b.type !== "dir") return -1;
        if (a.type !== "dir" && b.type === "dir") return 1;

        if (sortBy === "name") {
            return a.name.localeCompare(b.name) * order;
        }

        const prop = PROPERTY_MAP[sortBy] || "size";
        return ((a[prop] || 0) - (b[prop] || 0)) * order;
    });
}

export function handleSort(key) {
    if (FileManConfig.sortBy === key) {
        FileManConfig.sortOrder = FileManConfig.sortOrder === "asc" ? "desc" : "asc";
    } else {
        FileManConfig.sortBy = key;
        FileManConfig.sortOrder = "asc";
    }

    const buttons = document.querySelectorAll("#sort-container .sort-btn");
    buttons.forEach(btn => {
        btn.classList.remove("active");
        if (btn.getAttribute("onclick")?.includes(`'${key}'`)) {
            btn.classList.add("active");
            btn.textContent = `${btn.textContent.replace(/[▴▾]/g, "").trim()} ${FileManConfig.sortOrder === "asc" ? "▴" : "▾"}`;
        } else {
            btn.textContent = btn.textContent.replace(/[▴▾]/g, "").trim();
        }
    });

    renderList(FileManConfig.cachedItems, FileManConfig.currentPath);
}

window.handleSort = handleSort;

export async function fetchFiles(path = "", pushToHistory = true) {
    const isDirectFile = /\.[a-zA-Z0-9]{2,5}$/.test(path);
    const fetchPath = isDirectFile && path.includes("/") ? path.substring(0, path.lastIndexOf("/")) : (isDirectFile ? "" : path);

    if (pushToHistory) {
        window.history.pushState({ path }, "", path ? `/search/files/${path}` : "/search/files");
    }

    const storageKey = `files_${fetchPath || "root"}`;
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
        FileManConfig.cachedItems = JSON.parse(cachedData);
        renderList(FileManConfig.cachedItems, fetchPath);
    }

    try {
        const response = await fetch(`/list?path=${encodeURIComponent(fetchPath)}`);
        if (!response.ok) {
            if (!cachedData && typeof window.handleErrorResponse === "function") {
                window.handleErrorResponse(response.status, "Directory Access");
            }
            return;
        }

        const data = await response.json();
        FileManConfig.cachedItems = data;
        renderList(FileManConfig.cachedItems, fetchPath);
        localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
        if (!cachedData && typeof window.renderError === "function") {
            console.error("File Fetch Error:", err);
            window.renderError("500", "Connection lost", "Unable to reach the server.");
        }
    }
}
function createItemElement(item) {
    const div = document.createElement("div");
    div.className = item.type === "dir" ? "folder" : "file";
    if (`files/${item.path}` === FileManConfig.currentPreviewPath) div.classList.add("active-item");

    let metaString = "";
    if (item.type !== "dir") {
        if (FileManConfig.sortBy === "atime" || FileManConfig.sortBy === "mtime") {
            const prop = PROPERTY_MAP[FileManConfig.sortBy];
            const val = prop ? item[prop] : 0;
            metaString = ` <span class="item-meta">(${formatDate(val || 0)})</span>`;
        } else if (FileManConfig.sortBy === "size") {
            const val = item.size;
            metaString = ` <span class="item-meta">(${formatBytes(val || 0)})</span>`;
        }
    }

    const icon = item.type === "dir" ? "📁" : (iconMap[item.name.split(".").pop().toLowerCase()] || "❓");

    div.innerHTML = `<span class="icon">${icon}</span>${escapeHTML(item.name)}${metaString}`;
    div.onclick = () => item.type === "dir" ? fetchFiles(item.path) : showPreview(item.path);
    return div;
}
export function renderList(items, path) {
    FileManConfig.currentPath = path;
    const fileList = el("file-list");
    if (!fileList) return;

    renderBreadcrumbs(path);
    fileList.innerHTML = "";
    const fragment = document.createDocumentFragment();

    if (path) {
        const upDiv = document.createElement("div");
        upDiv.className = "folder";
        upDiv.textContent = "Upper directory";
        upDiv.onclick = () => {
            const parts = path.split("/").filter(Boolean);
            parts.pop();
            fetchFiles(parts.join("/"));
        };
        fragment.appendChild(upDiv);
    }

    sortItems(items).forEach(item => {
        const element = createItemElement(item);
        if (element instanceof Node) {
            fragment.appendChild(element);
        } else {
            console.warn("createItemElement did not return a valid DOM node for item:", item);
        }
    });

    fileList.appendChild(fragment);
}
export function renderBreadcrumbs(path) {
    const container = el("breadcrumb");
    if (!container) return;
    container.innerHTML = "";

    const parts = ["Files", ...path.split("/").filter(Boolean)];
    parts.forEach((part, i) => {
        const span = document.createElement("span");
        try {
            span.textContent = decodeURIComponent(part);
        } catch (err) {
            throw new Error("Invalid path encoding");
        }
        span.className = "breadcrumb-item";

        const targetPath = i === 0 ? "" : parts.slice(1, i + 1).join("/");
        span.onclick = () => fetchFiles(targetPath);

        container.appendChild(span);
        if (i < parts.length - 1) {
            const sep = document.createElement("span");
            sep.textContent = "/";
            sep.className = "breadcrumb-separator";
            container.appendChild(sep);
        }
    });
}