export const getIcon = (item) => (item.type === "dir" ? "📁" : "📖");

export async function fetchComics(path = "") {
    let cleanPath = path;

    if (cleanPath.startsWith("search/comics")) {
        cleanPath = cleanPath.replace(/^search\/comics\/?/, "");
    } else if (cleanPath.startsWith("/search/comics")) {
        cleanPath = cleanPath.replace(/^\/search\/comics\/?/, "");
    }

    const cacheKey = `comics_${cleanPath.length > 0 ? cleanPath : "root"}`;

    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData !== null) {
        return JSON.parse(cachedData);
    }

    const url = `/list?type=comic_zip&path=${encodeURIComponent(cleanPath)}`;
    const response = await fetch(url);

    if (response.status === 404) {
        const emptyResult = [];
        localStorage.setItem(cacheKey, JSON.stringify(emptyResult));
        return emptyResult;
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch comics: ${response.status}`);
    }

    const data = await response.json();

    localStorage.setItem(cacheKey, JSON.stringify(data));

    return data;
}

export function showPreview(comicPath) {
    window.location.href = "/comic?path=" + encodeURIComponent(comicPath);
}
