import { ComicManConfig } from "/scripts/comicSearcher/comicConfig";
import { getIcon, fetchComics, showPreview } from "/scripts/comicSearcher/comicService";
import { el, escapeHTML } from "/scripts/general/utils";

export function renderBreadcrumbs(path) {
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
        span.onclick = () => fetchComics(targetPath, true, { renderList, renderBreadcrumbs });

        container.append(span);
        if (i < parts.length - 1) {
            const sep = document.createElement("span");
            sep.textContent = "/";
            sep.className = "breadcrumb-separator";
            container.append(sep);
        }
    });
}

export function renderList(items, path, push = true) {
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

    renderBreadcrumbs(path);

    if (path) {
        const upDiv = document.createElement("div");
        upDiv.className = "folder";
        upDiv.innerHTML = `↑ 📁`;
        upDiv.onclick = () => {
            const parts = path.split("/").filter(Boolean);
            parts.pop();
            fetchComics(parts.join("/"), true, { renderList, renderBreadcrumbs });
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
                fetchComics(item.path, true, { renderList, renderBreadcrumbs });
            } else {
                showPreview(item.path);
            }
        };
        if (item.name !== "style.css" && item.name !== "background.mp4") fragment.append(div);
    });

    comicList.append(fragment);

    const cleanStylePath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
    const hasStyle = items.some(item => item.name === "style.css" && item.type === "file");
    const targetHref = (hasStyle && path) ? `/download${cleanStylePath}/style.css?type=comicStyle` : `/download/style.css?type=comicStyle`;

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
        const hasVideo = items.some(item => item.name === "background.mp4" && item.type === "file");
        if (hasVideo && path) {
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