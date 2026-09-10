import { fetchComics } from "/scripts/comicSearcher/comicService";
import { renderList, renderBreadcrumbs } from "/scripts/comicSearcher/comicUI";

const callbacks = { renderList, renderBreadcrumbs };

document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("popstate", (e) => {
        fetchComics(e.state?.path || "", false, callbacks);
        document.querySelector(".customComicSearchVideo").addEventListener("contextmenu", (event) => {
            event.preventDefault();
        })

    });

    const initialPath = window.location.pathname;
    const routePrefix = "/search/comics";

    if (initialPath.startsWith(routePrefix)) {
        const targetDir = initialPath.substring(routePrefix.length).replace(/^\//, "");
        fetchComics(targetDir, false, callbacks);
    } else {
        fetchComics("", false, callbacks);
    }
})