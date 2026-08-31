const CONFIG = {
    apiBase: "/api",
};

const ComicManConfig = {
    currentPath: "",
    currentPreviewPath: "",
    cachedItems: [],
};

const getIcon = (item) => {
    if (item.type === "dir") return "📁";
    return "📖";
};

async function fetchComics(path = "", push = true) {
    let cleanPath = path;
    if (cleanPath.startsWith("search/comics")) {
        cleanPath = cleanPath.replace(/^search\/comics\/?/, "");
    } else if (cleanPath.startsWith("/search/comics")) {
        cleanPath = cleanPath.replace(/^\/search\/comics\/?/, "");
    }

    const storageKey = `cache_comic_path_${cleanPath || "root"}`;
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
        ComicManConfig.cachedItems = JSON.parse(cachedData);
        renderList(ComicManConfig.cachedItems, cleanPath, push, false);
    }

    try {
        const url = `${CONFIG.apiBase}/list?path=${encodeURIComponent(cleanPath)}&type=comic`;
        const response = await fetch(url);

        if (response.status === 404) {
            ComicManConfig.cachedItems = [];
            localStorage.setItem(storageKey, JSON.stringify([]));
            renderList([], cleanPath, push, true);
            return;
        }

        if (!response.ok) {
            if (!cachedData) handleErrorResponse(response.status, "Directory Access");
            return;
        }

        const data = await response.json();
        ComicManConfig.cachedItems = data;
        renderList(ComicManConfig.cachedItems, cleanPath, push, false);
        
        localStorage.setItem(storageKey, JSON.stringify(data));

    } catch (err) {
        if (!cachedData) {
            console.error("Comic Fetch Error:", err);
            renderError("500", "CONNECTION LOST", "Unable to reach the server.");
        }
    }
}

function renderBreadcrumbs(path) {
    const container = el("breadcrumb");
    container.innerHTML = "";

const parts = ["Comics", ...path.split("/").filter(Boolean)];
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
        
        span.onclick = () => fetchComics(targetPath); 

        container.appendChild(span);
        if (i < parts.length - 1) {
            const sep = document.createElement("span");
            sep.textContent = "/";
            sep.className = "breadcrumb-separator";
            container.appendChild(sep);
        }
    });
}
function renderList(items, path, push = true) {
    ComicManConfig.currentPath = path;
    const comicList = el("comic-list");
    const searchTerm = el("comic-search").value.toLowerCase();

    comicList.innerHTML = "";
    const fragment = document.createDocumentFragment();

    const urlParts = path.split("/").filter(Boolean).join("/");
    const urlPath = urlParts ? `/search/comics/${urlParts}` : "/search/comics";

    if (push) {
        history.pushState({ path }, "", urlPath);
    }

    renderBreadcrumbs(path);

    if (path) {
        const upDiv = document.createElement("div");
        upDiv.className = "folder";
        upDiv.innerHTML = `↑ 📁`;
        upDiv.onclick = () => {
            const parts = path.split("/").filter(Boolean);
            parts.pop();
            fetchComics(parts.join("/"));
        };
        fragment.appendChild(upDiv);
    }

    items.forEach((item) => {
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) return;

        const div = document.createElement("div");
        div.className = item.type === "dir" ? "folder" : "comic";
        if (`comics/${item.path}` === ComicManConfig.currentPreviewPath) div.classList.add("active-item");

        div.innerHTML = `<span class="icon">${getIcon(item)}</span>${escapeHTML(item.name)}`;

        div.onclick = () => {
            if (item.type === "dir") {
                el("comic-search").value = "";
                fetchComics(item.path);
            } else {
                showPreview(item.path);
            }
        };
        fragment.appendChild(div);
    });

    comicList.appendChild(fragment);
}

window.addEventListener("popstate", (e) => {
    fetchComics(e.state?.path || "", false);
});

function showPreview(comicPath) {
    const redirectUrl = '/comics?path=' + encodeURIComponent(comicPath);
    window.location.href = redirectUrl;
}

const initialPath = window.location.pathname;
const routePrefix = "/search/comics";

if (initialPath.startsWith(routePrefix)) {
    const targetDir = initialPath.substring(routePrefix.length).replace(/^\//, "");
    fetchComics(targetDir, false);
} else {
    fetchComics("", false);
}