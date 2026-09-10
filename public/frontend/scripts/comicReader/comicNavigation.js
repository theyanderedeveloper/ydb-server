import { state, setCurrentPageIndex } from "/scripts/comicReader/comicState";
import { updateUrlPageParam } from "/scripts/comicReader/comicUI";

const pageInput = document.querySelector("#comicPageInput");

export function switchPage(index) {
    if (index < 0 || index >= state.loadedPageElements.length || index === state.currentPageIndex) return;

    const currentPage = state.loadedPageElements[state.currentPageIndex];
    const nextPage = state.loadedPageElements[index];

    currentPage.classList.remove("active");
    currentPage.style.display = "none";

    nextPage.style.display = "block";
    void nextPage.offsetWidth;
    nextPage.classList.add("active");

    const goingForward = index > state.currentPageIndex;
    const distance = Math.abs(index - state.currentPageIndex);
    const baseDelay = distance >= 100 ? 0 : 0.25;

    state.switcherElements.forEach((element, i) => {
        let delayFactor = goingForward ? i - state.currentPageIndex : state.currentPageIndex - i;
        if (delayFactor < 0) delayFactor = 0;

        element.style.setProperty('--delay', `${delayFactor * baseDelay}ms`);

        if (i <= index) {
            element.classList.add("active");
        } else {
            element.classList.remove("active");
        }
    });

    state.switcherElements[index].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

    if (pageInput) pageInput.value = index + 1;
    setCurrentPageIndex(index);
    updateUrlPageParam(state.currentPageIndex);
}

export function jumpToPageFromInput() {
    if (!pageInput) return;
    const pageVal = parseInt(pageInput.value, 10);
    if (!isNaN(pageVal)) {
        const targetIndex = pageVal - 1;
        if (targetIndex >= 0 && targetIndex < state.loadedPageElements.length) {
            switchPage(targetIndex);
            return;
        }
    }
    pageInput.value = state.currentPageIndex + 1;
}