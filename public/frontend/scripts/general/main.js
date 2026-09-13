import { initSidebar } from "/scripts/general/sidebar";
import { initDropdowns } from "/scripts/general/dropdown";
import { setQuotes } from "/scripts/general/quotes";
import { el, debounce } from "/scripts/general/utils";

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();
    initDropdowns();
    setQuotes();

    document.querySelectorAll(".frameBack").forEach((e) => {
        console.log(document.referrer); const prevUrl = document.referrer || "/";

        e.setAttribute("href", prevUrl);
        e.addEventListener("click", (evt) => {
            if (!document.referrer) {
                evt.preventDefault();
                history.back();
            }
        });
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