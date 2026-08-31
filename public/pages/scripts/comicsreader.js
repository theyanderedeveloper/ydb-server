const zip = new JSZip();

const queryParams = new URLSearchParams(window.location.search);
const comicFullName = queryParams.get("path");
let currentPageIndex = parseInt(queryParams.get("page"), 10) || 0;
let comicData

const loadedPageElements = [];
const switcherElements = [];

(async () => {
    if (comicFullName) {
        try {
            const decodedPathFull = decodeURIComponent(comicFullName);
            let decodedPath = "";

            const parts = decodedPathFull.split("/");

            parts.forEach((part, i) => {
                const isLast = i === parts.length - 1;

                if (!part.endsWith(".comic")) {
                    decodedPath += part + (isLast ? "" : " // ");
                } else {
                    decodedPath += part;
                }
            });


            document.querySelector("#comicPath").innerHTML = `<a id="comicBack">↩ ${decodedPath}</a>`;

            const comicFile = await getComicFile(comicFullName);

            await loadComicImages(comicFile);

        } catch (err) {
            console.error("Error loading comic:", err);
            document.querySelector("#comicPath").textContent = "Error loading comic content";
        }
    } else {
        document.querySelector("#comicPath").textContent = "No path provided";
    }
})();

async function getComicFile(url) {
    try {
        const safePath = encodeURIComponent(url);
        const response = await fetch(`/api/download?path=${safePath}&type=comic`);

        if (!response.ok) {
            throw new Error(`Failed to fetch comic: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        return blob;
    } catch (error) {
        console.error("Error downloading comic file:", error);
        throw error;
    }
}

let globalRatioX = 1;
let globalRatioY = 1;

async function loadComicImages(zipBlob) {
    try {
        const contents = await zip.loadAsync(zipBlob);

        const comicFullDetails = contents.file("comic.json");
        if (!comicFullDetails) {
            throw new Error("comic.json not found in the zip archive.");
        }

        const jsonString = await comicFullDetails.async("string");
        comicData = JSON.parse(jsonString);

        const imageFilenames = comicData.images;
        if (!imageFilenames || imageFilenames.length === 0) {
            throw new Error("No images listed in comic.json");
        }

        if (currentPageIndex < 0 || currentPageIndex >= imageFilenames.length) {
            currentPageIndex = 0;
        }

        const comicContent = document.getElementById("comicContent");
        const comicPagesSelector = document.getElementById("comicPagesSelector");

        comicContent.innerHTML = "";
        comicPagesSelector.innerHTML = "";

        if (comicData.aspectratio) {
            const normalizedRatio = comicData.aspectratio.replace(':', '/');
            const parts = normalizedRatio.split('/').map(num => parseFloat(num.trim()));

            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                globalRatioX = parts[0];
                globalRatioY = parts[1];
            }
        }

        for (let i = 0; i < imageFilenames.length; i++) {
            const targetImageName = imageFilenames[i];
            const imageFile = contents.file(targetImageName);

            if (!imageFile) {
                console.warn(`Image ${targetImageName} not found in the zip.`);
                continue;
            }

            const imageBlob = await imageFile.async("blob");
            const imageUrl = URL.createObjectURL(imageBlob);

            const imgElement = document.createElement("img");
            imgElement.src = imageUrl;
            imgElement.classList.add("comicPage");

            if (i !== currentPageIndex) {
                imgElement.style.display = "none";
            } else {
                imgElement.classList.add("active");
            }
            comicContent.appendChild(imgElement);
            loadedPageElements.push(imgElement);

            const comicPageSwitcher = document.createElement("div");
            comicPageSwitcher.classList.add("comicPageSwitcher");

            if (i <= currentPageIndex) {
                comicPageSwitcher.classList.add("active");
            }
            comicPageSwitcher.addEventListener("mousemove", (e) => {
                if (e.buttons === 1) {
                    switchPage(i);
                }
            });

            comicPageSwitcher.addEventListener("mousedown", (e) => {
                if (e.buttons === 1) {
                    switchPage(i);
                }
            });

            comicPagesSelector.append(comicPageSwitcher);
            switcherElements.push(comicPageSwitcher);
        }

        resizeComicPages();

        window.addEventListener("resize", resizeComicPages);

        if (typeof updateUrlPageParam === "function") {
            updateUrlPageParam(currentPageIndex);
        }
        if (comicData.description) {
            document.getElementById("comicDescription").textContent = comicData.description;
        }

        if (comicData.fullname) {
            document.getElementById("comicFullName").textContent = comicData.fullname;
            document.querySelector("title").textContent = `Reading ${comicData.fullname} | Yandere's Database`;
            
        }


    } catch (error) {
        console.error("Error processing comic:", error);
    }
}

function resizeComicPages() {
    loadedPageElements.forEach(imgElement => {
        if (globalRatioX > globalRatioY) {
            imgElement.style.width = Math.min(window.innerHeight, window.innerWidth) + "px";
            imgElement.style.height = (Math.min(window.innerHeight, window.innerWidth) / globalRatioX) * globalRatioY + "px";
        } else if (globalRatioX === globalRatioY) {
            imgElement.style.width = Math.min(window.innerHeight, window.innerWidth) + "px";
            imgElement.style.height = Math.min(window.innerHeight, window.innerWidth) + "px";
        } else if (globalRatioX < globalRatioY) {
            imgElement.style.width = (Math.min(window.innerHeight, window.innerWidth) / globalRatioY) * globalRatioX + "px";
            imgElement.style.height = Math.min(window.innerHeight, window.innerWidth) + "px";
        }
    });
}

function switchPage(index) {
    if (index < 0 || index >= loadedPageElements.length || index === currentPageIndex) return;

    const currentPage = loadedPageElements[currentPageIndex];
    const nextPage = loadedPageElements[index];

    currentPage.classList.remove("active");
    currentPage.style.display = "none";

    nextPage.style.display = "block";
    void nextPage.offsetWidth;
    nextPage.classList.add("active");

    const goingForward = index > currentPageIndex;
    const baseDelay = 40;

    switcherElements.forEach((element, i) => {
        let delayFactor = 0;

        if (goingForward) {
            delayFactor = i - currentPageIndex;
            if (delayFactor < 0) delayFactor = 0;
        } else {
            delayFactor = currentPageIndex - i;
            if (delayFactor < 0) delayFactor = 0;
        }

        element.style.setProperty('--delay', `${delayFactor * baseDelay}ms`);

        if (i <= index) {
            element.classList.add("active");
        } else {
            element.classList.remove("active");
        }
    });

    currentPageIndex = index;
}

document.querySelector("#comicPrev").addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentPageIndex > 0) {
        switchPage(currentPageIndex - 1);
    }
});

document.querySelector("#comicNext").addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentPageIndex < loadedPageElements.length - 1) {
        switchPage(currentPageIndex + 1);
    }
});

window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" && currentPageIndex > 0) {
        switchPage(currentPageIndex - 1);
    } else if (e.key === "ArrowRight" && currentPageIndex < loadedPageElements.length - 1) {
        switchPage(currentPageIndex + 1);
    }
});


document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#comicBack").addEventListener("click", () => {
        history.back();
    });
});