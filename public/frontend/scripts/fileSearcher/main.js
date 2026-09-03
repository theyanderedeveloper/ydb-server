import { setIconMap }  from '/scripts/fileSearcher/config';
import { fetchFiles }  from '/scripts/fileSearcher/fileManager';
import { showPreview } from '/scripts/fileSearcher/previewManager';

window.addEventListener("popstate", (e) => {
    fetchFiles(e.state?.path || "");
});

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const iconRes = await fetch('/iconMap.json');
        const iconData = await iconRes.json();
        setIconMap(iconData);
    } catch (e) {
        console.warn("Could not load icon map.");
    }

    const initialPath = window.location.pathname;
    const routePrefix = "/search/files";

    if (initialPath.startsWith(routePrefix)) {
        const targetClean = initialPath.substring(routePrefix.length).replace(/^\//, "");

        if (!targetClean) {
            await fetchFiles("");
            return;
        }

        const isDirectFileLink = /\.[a-zA-Z0-9]{2,5}$/.test(targetClean);

        if (isDirectFileLink) {
            await fetchFiles(targetClean);
            showPreview(targetClean);
        } else {
            await fetchFiles(targetClean);
        }
    } else {
        await fetchFiles("");
    }
});