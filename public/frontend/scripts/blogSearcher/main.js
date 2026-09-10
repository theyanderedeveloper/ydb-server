import { fetchBlogs } from "/scripts/blogSearcher/blogService";
import { renderList, renderBreadcrumbs } from "/scripts/blogSearcher/blogUI";

const callbacks = { renderList, renderBreadcrumbs };

document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("popstate", (e) => {
        fetchBlogs(e.state?.path || "", false, callbacks);
    });

    const initialPath = window.location.pathname;
    const routePrefix = "/search/blogs";

    if (initialPath.startsWith(routePrefix)) {
        const targetDir = initialPath.substring(routePrefix.length).replace(/^\//, "");
        fetchBlogs(targetDir, false, callbacks);
    } else {
        fetchBlogs("", false, callbacks);
    }
})