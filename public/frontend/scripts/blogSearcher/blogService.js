import { BlogManConfig } from "/scripts/blogSearcher/blogConfig";

export const getIcon = (item) => (item.type === "dir" ? "📁" : "📖");

export async function fetchBlogs(path = "", push = true, callbacks) {
    const { renderList, handleErrorResponse, renderError } = callbacks;
    let cleanPath = path;
    
    if (cleanPath.startsWith("search/blogs")) {
        cleanPath = cleanPath.replace(/^search\/blogs\/?/, "");
    } else if (cleanPath.startsWith("/search/blogs")) {
        cleanPath = cleanPath.replace(/^\/search\/blogs\/?/, "");
    }

    const storageKey = `blogs_${cleanPath || "root"}`;
    const cachedData = localStorage.getItem(storageKey);

    if (cachedData) {
        BlogManConfig.cachedItems = JSON.parse(cachedData);
        renderList(BlogManConfig.cachedItems, cleanPath, push, false);
    }

    try {
        const url = `/list?type=blog_zip&path=${encodeURIComponent(cleanPath)}`;
        const response = await fetch(url);

        if (response.status === 404) {
            BlogManConfig.cachedItems = [];
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
        BlogManConfig.cachedItems = data;
        renderList(BlogManConfig.cachedItems, cleanPath, push, false);
        localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
        if (!cachedData) {
            console.error("Blog Fetch Error:", err);
            if (renderError) {
                renderError("500", "CONNECTION LOST", "Unable to reach the server.");
            }
        }
    }
}

export function showPreview(blogPath) {
    window.location.href = '/blog?path=' + encodeURIComponent(blogPath);
}