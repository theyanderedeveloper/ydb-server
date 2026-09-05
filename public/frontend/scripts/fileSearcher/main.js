import { setIconMap, FileManConfig, setEXTMap } from "/scripts/fileSearcher/config";
import { fetchFiles, renderList } from "/scripts/fileSearcher/fileManager";
import { showPreview } from "/scripts/fileSearcher/previewManager";

const isFile = p => /\.[a-z0-9]{2,5}$/i.test(p);
const getCleanPath = () => window.location.pathname.replace(/^\/search\/files\/?/, "");

window.addEventListener("popstate", (e) => {
    const path = e.state?.path || getCleanPath();
    (isFile(path) ? showPreview : fetchFiles)(path);
});

document.addEventListener("DOMContentLoaded", async () => {
    try {
        setIconMap(await (await fetch("/resources/iconMap.json")).json());
        setEXTMap(await (await fetch("/resources/extMap.json")).json());
    } catch {
        console.warn("Could not load icon map.");
    }

    const targetClean = getCleanPath();
    
    await fetchFiles(targetClean);

    if (isFile(targetClean)) showPreview(targetClean);
});