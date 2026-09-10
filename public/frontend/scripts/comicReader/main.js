import { state, setCurrentPageIndex, setComicData, setRatios } from "/scripts/comicReader/comicState";
import { getComicMetadata } from "/scripts/comicReader/comicApi";
import { handleLoadError, resizeComicPages, updateUrlPageParam } from "/scripts/comicReader/comicUI";
import { switchPage, jumpToPageFromInput } from "/scripts/comicReader/comicNavigation";

const queryParams = new URLSearchParams(window.location.search);
const comicFullName = queryParams.get("path");
const parsedPage = parseInt(queryParams.get("page"), 10);
setCurrentPageIndex((!isNaN(parsedPage) && parsedPage > 0) ? parsedPage - 1 : 0);

document.addEventListener("DOMContentLoaded", async () => {
    const pageInput = document.querySelector("#comicPageInput");

    if (!comicFullName) {
        handleLoadError("No comic path provided. You will be redirected back in 5 seconds.");
        return;
    }

    try {
        const decodedPathFull = decodeURIComponent(comicFullName);
        let decodedPath = "";
        const parts = decodedPathFull.split("/");

        parts.forEach((part, i) => {
            const isLast = i === parts.length - 1;
            decodedPath += !part.endsWith(".comic") ? part + (isLast ? "" : " // ") : part;
        });

        document.querySelector("#comicPath").innerHTML = `<a id="comicBack">↩ ${decodedPath}</a>`;

        const comicInfo = await getComicMetadata(comicFullName);
        
        setComicData(comicInfo);
        const imageFilenames = state.comicData.images;

        if (!imageFilenames || imageFilenames.length === 0) throw new Error("No images listed in comic.json");
        if (state.currentPageIndex < 0 || state.currentPageIndex >= imageFilenames.length) setCurrentPageIndex(0);

        const comicContent = document.getElementById("comicContent");
        const comicPagesSelector = document.getElementById("comicPagesSelector");
        comicContent.innerHTML = "";
        comicPagesSelector.innerHTML = "";

        if (state.comicData.aspectratio) {
            const normalizedRatio = state.comicData.aspectratio.replace(':', '/');
            const parts = normalizedRatio.split('/').map(num => parseFloat(num.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                setRatios(parts[0], parts[1]);
            }
        }

        const safePath = encodeURIComponent(comicFullName);

        imageFilenames.forEach((targetImageName, i) => {
            const imageUrl = `/download/${safePath}/${encodeURIComponent(targetImageName)}?type=comicreaderdecompressed`;
            const imgElement = document.createElement("img");
            imgElement.src = imageUrl;
            imgElement.classList.add("comicPage");

            if (i !== state.currentPageIndex) {
                imgElement.style.display = "none";
            } else {
                imgElement.classList.add("active");
            }
            comicContent.appendChild(imgElement);
            state.loadedPageElements.push(imgElement);

            const comicPageSwitcher = document.createElement("div");
            comicPageSwitcher.classList.add("comicPageSwitcher");
            comicPageSwitcher.textContent = i + 1;

            if (i <= state.currentPageIndex) comicPageSwitcher.classList.add("active");

            const handleSwitch = (e) => { if (e.buttons === 1) switchPage(i); };
            comicPageSwitcher.addEventListener("mousemove", handleSwitch);
            comicPageSwitcher.addEventListener("mousedown", handleSwitch);

            comicPagesSelector.append(comicPageSwitcher);
            state.switcherElements.push(comicPageSwitcher);
        });

        resizeComicPages();
        window.addEventListener("resize", resizeComicPages);
        updateUrlPageParam(state.currentPageIndex);

        if (state.comicData.description) document.getElementById("comicDescription").textContent = state.comicData.description;
        if (state.comicData.fullname) {
            document.getElementById("comicFullName").textContent = state.comicData.fullname;
            document.querySelector("title").textContent = `Reading ${state.comicData.fullname} | Vanilla's Vault`;
        }
        const backBtn = document.querySelector("#comicBack");
        if (backBtn) backBtn.addEventListener("click", () => history.back());

    } catch (err) {
        handleLoadError("Failed to load comic content. You will be redirected back in 5 seconds.");
        console.error("Error loading comic:", err);
    }

    document.querySelector("#comicPrev").addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.currentPageIndex > 0) switchPage(state.currentPageIndex - 1);
    });

    document.querySelector("#comicNext").addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.currentPageIndex < state.loadedPageElements.length - 1) switchPage(state.currentPageIndex + 1);
    });

    window.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft" && state.currentPageIndex > 0) {
            switchPage(state.currentPageIndex - 1);
        } else if (e.key === "ArrowRight" && state.currentPageIndex < state.loadedPageElements.length - 1) {
            switchPage(state.currentPageIndex + 1);
        }
    });

    if (pageInput) {
        pageInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                jumpToPageFromInput();
                pageInput.blur();
            }
        });
        pageInput.addEventListener("blur", jumpToPageFromInput);
    }
});
