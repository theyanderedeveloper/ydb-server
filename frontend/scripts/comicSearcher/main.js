import { fetchComics } from "/scripts/comicSearcher/comicService";
import { 
    renderBreadcrumbs, 
    renderComicsAndFolders, 
    renderStyles, 
    renderAuthorPages 
} from "/scripts/comicSearcher/comicUI";

async function loadAndRender(path = "", push = true) {
    try {
        const items = await fetchComics(path);
        
        const navigate = (targetPath) => loadAndRender(targetPath, true);

        renderBreadcrumbs(path, navigate);
        renderComicsAndFolders(items, path, push, navigate, navigate);
        renderStyles(items, path);
        renderAuthorPages(items, path)
    } catch (err) {
        console.error("Failed to load and render comics:", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("popstate", (e) => {
        loadAndRender(e.state?.path || "", false);
        
        document
            .querySelector(".customComicSearchVideo")
            ?.addEventListener("contextmenu", (event) => {
                event.preventDefault();
            });
    });

    const initialPath = window.location.pathname;
    const routePrefix = "/search/comics";

    if (initialPath.startsWith(routePrefix)) {
        const targetDir = initialPath.substring(routePrefix.length).replace(/^\//, "");
        loadAndRender(targetDir, false);
    } else {
        loadAndRender("", false);
    }
});