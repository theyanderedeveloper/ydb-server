import { BlogManConfig } from "/scripts/blogSearcher/blogConfig";
import { getIcon, fetchBlogs, showPreview } from "/scripts/blogSearcher/blogService";

export function renderBreadcrumbs(path) {
    const container = el("breadcrumb");
    if (!container) return;
    container.innerHTML = "";

    const parts = ["Blogs", ...path.split("/").filter(Boolean)];
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
        span.onclick = () => fetchBlogs(targetPath, true, { renderList, renderBreadcrumbs });

        container.appendChild(span);
        if (i < parts.length - 1) {
            const sep = document.createElement("span");
            sep.textContent = "/";
            sep.className = "breadcrumb-separator";
            container.appendChild(sep);
        }
    });
}

export function renderList(items, path, push = true) {
    BlogManConfig.currentPath = path;
    const blogList = el("blog-list");
    if (!blogList) return;

    blogList.innerHTML = "";
    const fragment = document.createDocumentFragment();

    const urlParts = path.split("/").filter(Boolean).join("/");
    const urlPath = urlParts ? `/search/blogs/${urlParts}` : "/search/blogs";

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
            fetchBlogs(parts.join("/"), true, { renderList, renderBreadcrumbs });
        };
        blogList.appendChild(upDiv);
    }

    items.forEach((item) => {
        const div = document.createElement("div");
        div.className = item.type === "dir" ? "folder" : "blog";
        if (`blogs/${item.path}` === BlogManConfig.currentPreviewPath) {
            div.classList.add("active-item");
        }

        div.innerHTML = `<span class="icon">${getIcon(item)}</span>${escapeHTML(item.name)}`;

        div.onclick = () => {
            if (item.type === "dir") {
                fetchBlogs(item.path, true, { renderList, renderBreadcrumbs });
            } else {
                showPreview(item.path);
            }
        };
        if (item.name !== "style.css" || item.name !== "background.mp4") fragment.appendChild(div);
    });

    blogList.appendChild(fragment);

    document.querySelectorAll(".customBlogSearchCSS").forEach((elNode) => {
        elNode.remove();
    });

    const customBlogSearchStyle = document.createElement("link");
    customBlogSearchStyle.rel = "stylesheet";
    const cleanStylePath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
    customBlogSearchStyle.href = `/download${cleanStylePath}/style.css?type=blogStyle`;
    customBlogSearchStyle.classList.add("customBlogSearchCSS");

    document.querySelector("head").appendChild(customBlogSearchStyle);
}