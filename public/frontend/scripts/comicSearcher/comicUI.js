import { ComicManConfig } from "/scripts/comicSearcher/comicConfig";
import { getIcon, showPreview } from "/scripts/comicSearcher/comicService";
import { el, escapeHTML } from "/scripts/general/utils";

export function renderBreadcrumbs(path, onNavigate) {
    const container = el("breadcrumb");
    if (!container) return;
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
        span.onclick = () => onNavigate(targetPath);

        container.append(span);
        if (i < parts.length - 1) {
            const sep = document.createElement("span");
            sep.textContent = "/";
            sep.className = "breadcrumb-separator";
            container.append(sep);
        }
    });
}

export function renderComicsAndFolders(items, path, push = true, onNavigate, onFolderClick) {
    ComicManConfig.currentPath = path;
    const comicList = el("comic-list");
    if (!comicList) return;

    comicList.innerHTML = "";
    const fragment = document.createDocumentFragment();

    const urlParts = path.split("/").filter(Boolean).join("/");
    const urlPath = urlParts ? `/search/comics/${urlParts}` : "/search/comics";

    if (push) {
        history.pushState({ path }, "", urlPath);
    }

    if (path) {
        const upDiv = document.createElement("div");
        upDiv.className = "folder";
        upDiv.innerHTML = `↑ 📁`;
        upDiv.onclick = () => {
            const parts = path.split("/").filter(Boolean);
            parts.pop();
            onNavigate(parts.join("/"));
        };
        comicList.append(upDiv);
    }

    items.forEach((item) => {
        const div = document.createElement("div");
        div.className = item.type === "dir" ? "folder" : "comic";
        if (`comics/${item.path}` === ComicManConfig.currentPreviewPath) {
            div.classList.add("active-item");
        }

        div.innerHTML = `<span class="icon">${getIcon(item)}</span>${escapeHTML(item.name)}`;

        div.onclick = () => {
            if (item.type === "dir") {
                onFolderClick(item.path);
            } else {
                showPreview(item.path);
            }
        };
        if (
            item.name !== "style.css" &&
            item.name !== "background.mp4" &&
            item.name !== "data.json"
        )
            fragment.append(div);
    });

    comicList.append(fragment);
}

export function renderStyles(items, path) {
    const cleanStylePath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
    const targetHref =
        items.some((item) => item.name === "style.css" && item.type === "file") && path
            ? `/download${cleanStylePath}/style.css?type=comicStyle`
            : `/download/style.css?type=comicStyle`;

    let customComicSearchStyle = document.querySelector(".customComicSearchCSS");

    if (!customComicSearchStyle || customComicSearchStyle.getAttribute("href") !== targetHref) {
        customComicSearchStyle = document.createElement("link");
        customComicSearchStyle.rel = "stylesheet";
        customComicSearchStyle.href = targetHref;
        customComicSearchStyle.classList.add("customComicSearchCSS");

        customComicSearchStyle.onerror = () => {
            if (!customComicSearchStyle.dataset.fallback) {
                customComicSearchStyle.dataset.fallback = "true";
                customComicSearchStyle.href = "/download/style.css?type=comicStyle";
            } else {
                customComicSearchStyle.remove();
            }
        };

        document.querySelector("head").prepend(customComicSearchStyle);
    }

    const videoEl = document.querySelector(".customComicSearchVideo");
    if (videoEl) {
        if (items.some((item) => item.name === "background.mp4" && item.type === "file") && path) {
            const targetVideoSrc = `/download${cleanStylePath}/background.mp4?type=comicVideo`;
            if (videoEl.getAttribute("src") !== targetVideoSrc) {
                videoEl.style.display = "";
                videoEl.src = targetVideoSrc;
                videoEl.onerror = () => {
                    videoEl.style.display = "none";
                    videoEl.removeAttribute("src");
                };
            }
        } else {
            videoEl.style.display = "none";
            videoEl.removeAttribute("src");
        }
    }
}

export async function renderAuthorPages(items, path) {
    const cleanStylePath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
    const authorPagesEl = document.querySelector("#authorPages");
    if (!authorPagesEl) return;

    authorPagesEl.innerHTML = "";

    const cacheKey = `comics_authors_${path ? path : "root"}`;

    const renderEntries = (rawData) => {
        authorPagesEl.innerHTML = "";
        
        const data = Array.isArray(rawData) ? rawData : rawData.authors || Object.values(rawData);

        if (data && data.length > 0) {
            const fragment = document.createDocumentFragment();

            data.forEach((entry) => {
                const code = document.createElement("li");
                const a = document.createElement("a");

                if (entry.url) a.href = entry.url;
                if (entry.textBefore) a.append(entry.textBefore);

                if (entry.logo) {
                    const img = document.createElement("img");
                    img.src = `/resources/media/logos/${entry.logo}`;
                    a.append(img);
                }

                if (entry.textAfter) a.append(entry.textAfter);

                code.append(a);
                fragment.append(code);
            });

            authorPagesEl.append(fragment);
        }
    };

    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        try {
            renderEntries(JSON.parse(cachedData));
        } catch (e) {
            console.error("Error parsing cached author pages:", e);
        }
    }

    try {
        const response = await fetch(
            `/download${cleanStylePath}/data.json?type=comicAuthorDetails`,
        );

        if (!response.ok) {
            console.log(`No author data found at: /download${cleanStylePath}/data.json`);
            return;
        }

        const data = await response.json();
        localStorage.setItem(cacheKey, JSON.stringify(data));
        renderEntries(data);
    } catch (err) {
        console.error("Error loading author pages:", err);
    }
}