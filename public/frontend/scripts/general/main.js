import { initSidebar } from "/scripts/general/sidebar";
import { setQuotes } from "/scripts/general/quotes";
import { el, debounce } from "/scripts/general/utils";

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    setQuotes();

    document.querySelectorAll(".frameBack").forEach((e) => {
        e.addEventListener("click", () => history.back());
    });

    const fullscreenBtn = document.querySelector('.fullScreen');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const targetSelector = fullscreenBtn.getAttribute('data-target');
            const targetElement = document.querySelector(targetSelector);

            if (!targetElement) return;

            if (!document.fullscreenElement) {
                targetElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    const searchInput = el("file-search");
    if (searchInput && typeof renderList === "function" && typeof FileManConfig !== "undefined") {
        searchInput.addEventListener(
            "input",
            debounce(() => {
                renderList(FileManConfig.cachedItems, FileManConfig.currentPath, false);
            }, 200),
        );
    }
});