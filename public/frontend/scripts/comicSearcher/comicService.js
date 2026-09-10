import { ComicManConfig } from "/scripts/comicSearcher/comicConfig";

export const getIcon = (item) => (item.type === "dir" ? "📁" : "📖");

export async function fetchComics(path = "", push = true, callbacks) {
    const { renderList, handleErrorResponse, renderError } = callbacks;
    let cleanPath = path;
    
    if (cleanPath.startsWith("search/comics")) {
        cleanPath = cleanPath.replace(/^search\/comics\/?/, "");
    } else if (cleanPath.startsWith("/search/comics")) {
        cleanPath = cleanPath.replace(/^\/search\/comics\/?/, "");
    }

    const storageKey = `comics_${cleanPath || "root"}`;
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
        ComicManConfig.cachedItems = JSON.parse(cachedData);
        renderList(ComicManConfig.cachedItems, cleanPath, push, false);
    }

    try {
        const url = `/list?type=comic_zip&path=${encodeURIComponent(cleanPath)}`;
        const response = await fetch(url);

        if (response.status === 404) {
            ComicManConfig.cachedItems = [];
            localStorage.setItem(storageKey, JSON.stringify([]));
            renderList([], cleanPath, push, true);
            return;
        }

        if (!response.ok) {
            if (!cachedData && handleErrorResponse) {
                handleErrorResponse(response.status, "Directory Access");
            }
            return;
        }

        const data = await response.json();
        ComicManConfig.cachedItems = data;
        renderList(ComicManConfig.cachedItems, cleanPath, push, false);
        localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
        if (!cachedData) {
            console.error("Comic Fetch Error:", err);
            if (renderError) {
                renderError("500", "CONNECTION LOST", "Unable to reach the server.");
            }
        }
    }
}

export function showPreview(comicPath) {
    window.location.href = '/comic?path=' + encodeURIComponent(comicPath);
}