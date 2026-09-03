import { FileManConfig } from '/scripts/fileSearcher/config';
import { el, escapeHTML, getIcon, formatBytes, formatDate } from '/scripts/fileSearcher/utils';
import { showPreview } from '/scripts/fileSearcher/previewManager';

export function sortItems(items) {
    const key = FileManConfig.sortBy;
    const order = FileManConfig.sortOrder === "asc" ? 1 : -1;

    return [...items].sort((a, b) => {
        if (a.type === "dir" && b.type !== "dir") return -1;
        if (a.type !== "dir" && b.type === "dir") return 1;

        let valA, valB;
        if (key === "name") {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
            return valA.localeCompare(valB) * order;
        }

        if (key === "atime") {
            valA = a.createdAt || 0;
            valB = b.createdAt || 0;
        } else if (key === "mtime") {
            valA = a.updatedAt || 0;
            valB = b.updatedAt || 0;
        } else if (key === "size") {
            valA = a.size || 0;
            valB = b.size || 0;
        }

        return (valA - valB) * order;
    });
}

export function handleSort(key) {
    if (FileManConfig.sortBy === key) {
        FileManConfig.sortOrder = FileManConfig.sortOrder === "asc" ? "desc" : "asc";
    } else {
        FileManConfig.sortBy = key;
        FileManConfig.sortOrder = "asc";
    }
    renderList(FileManConfig.cachedItems, FileManConfig.currentPath);
}

window.handleSort = handleSort;

export function renderSortButtons() {
    const container = el("sort-container");
    if (!container) return;

    const buttons = [
        { key: "name", label: "Name" },
        { key: "atime", label: "Created" },
        { key: "mtime", label: "Modified" },
        { key: "size", label: "Size" }
    ];

    container.innerHTML = buttons.map(btn => {
        const isActive = FileManConfig.sortBy === btn.key;
        const arrow = isActive ? (FileManConfig.sortOrder === "asc" ? " ▴" : " ▾") : "";
        const activeClass = isActive ? "sort-btn active" : "sort-btn";
        return `<button class="${activeClass}" onclick="handleSort('${btn.key}')">${btn.label}${arrow}</button>`;
    }).join("");
}

export async function fetchFiles(path = "") {
    let cleanPath = path;
    const isDirectFile = /\.[a-zA-Z0-9]{2,5}$/.test(cleanPath);
    let fetchPath = cleanPath;

    if (isDirectFile && cleanPath.includes("/")) {
        fetchPath = cleanPath.substring(0, cleanPath.lastIndexOf("/"));
    } else if (isDirectFile) {
        fetchPath = "";
    }

    const newUrl = cleanPath ? `/search/files/${cleanPath}` : "/search/files";
    window.history.pushState({ path: cleanPath }, "", newUrl);

    const storageKey = `files_${fetchPath || "root"}`;
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
        FileManConfig.cachedItems = JSON.parse(cachedData);
        renderList(FileManConfig.cachedItems, fetchPath);
    }

    try {
        const url = `/list?path=${encodeURIComponent(fetchPath)}`;
        const response = await fetch(url);

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

export function renderList(items, path) {
    FileManConfig.currentPath = path;
    const fileList = el("file-list");
    if (!fileList) return;

    renderBreadcrumbs(path);
    renderSortButtons();

    fileList.innerHTML = "";
    const fragment = document.createDocumentFragment();

    if (path) {
        const upDiv = document.createElement("div");
        upDiv.className = "folder";
        upDiv.innerHTML = `Upper directory`;
        upDiv.onclick = () => {
            const parts = path.split("/").filter(Boolean);
            parts.pop();
            fetchFiles(parts.join("/"));
        };
        fragment.appendChild(upDiv);
    }

    const processedItems = sortItems(items);

    processedItems.forEach((item) => {
        const div = document.createElement("div");
        div.className = item.type === "dir" ? "folder" : "file";
        if (`files/${item.path}` === FileManConfig.currentPreviewPath) div.classList.add("active-item");

        let metaString = "";
        if (item.type !== "dir") {
            if (FileManConfig.sortBy === "atime") {
                metaString = ` <span class="item-meta">(${formatDate(item.createdAt)})</span>`;
            } else if (FileManConfig.sortBy === "mtime") {
                metaString = ` <span class="item-meta">(${formatDate(item.updatedAt)})</span>`;
            } else {
                metaString = ` <span class="item-meta">(${formatBytes(item.size)})</span>`;
            }
        }

        const displayName = escapeHTML(item.name);
        div.innerHTML = `<span class="icon">${getIcon(item)}</span>${displayName}${metaString}`;

        div.onclick = () => {
            if (item.type === "dir") {
                fetchFiles(item.path);
            } else {
                showPreview(item.path);
            }
        };
        fragment.appendChild(div);
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
        let decodedPath;
        try {
            decodedPath = decodeURIComponent(part);
        } catch (err) {
            throw new Error("Invalid path encoding");
        }

        span.textContent = decodedPath;
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