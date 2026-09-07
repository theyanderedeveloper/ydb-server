const queryParams = new URLSearchParams(window.location.search);
const comicFullName = queryParams.get("path");
let currentPageIndex = parseInt(queryParams.get("page"), 10) || 0;
let comicData;

const pageInput = document.querySelector("#comicPageInput");
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

            const comicInfo = await getComicMetadata(comicFullName);
            
            await loadComicImages(comicInfo, comicFullName);
            
        } catch (err) {
            document.querySelector("#comicHeader").style.display = "none"
            document.querySelector("#comicFooter").style.display = "none"
            console.error("Error loading comic:", err);
            showErrorFrame("Failed to load comic content. You will be redirected back in 5 seconds.");
        }
    } else {
        document.querySelector("#comicHeader").style.display = "none"
        document.querySelector("#comicFooter").style.display = "none"
        showErrorFrame("No comic path provided. You will be redirected back in 5 seconds.");
    }
})();

function showErrorFrame(message) {
    const comicContent = document.getElementById("comicContent");
    if (!comicContent) return;

    let countdown = 5;

    comicContent.innerHTML = `
        <div class="frame">
            <div class="frameHeader">
                <div class="frameBack" id="errorRedirectBtn">↩</div>
                <div class="frameID">Loading Error</div>
            </div>
            <div class="frameText" style="margin-top: 16px;">
                ${message} <br>
                Redirecting in <span id="countdownTimer">${countdown}</span> seconds...
            </div>
        </div>
    `;

    const redirect = () => {
        if (window.history.length > 1) {
            history.back();
        } else {
            window.location.href = "/";
        }
    };

    document.getElementById("errorRedirectBtn").addEventListener("click", redirect);

    const timerInterval = setInterval(() => {
        countdown--;
        const timerEl = document.getElementById("countdownTimer");
        if (timerEl) {
            timerEl.textContent = countdown;
        }
        if (countdown <= 0) {
            clearInterval(timerInterval);
            redirect();
        }
    }, 1000);
}

async function getComicMetadata(url) {
    try {
        const safePath = encodeURIComponent(url);
        const response = await fetch(`/download/${safePath}/comic.json?type=creader`);

        if (!response.ok) {
            throw new Error(`Failed to fetch comic.json: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error downloading comic metadata:", error);
        throw error;
    }
}

let globalRatioX = 1;
let globalRatioY = 1;

async function loadComicImages(data, url) {
    try {
        comicData = data;

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

        const safePath = encodeURIComponent(url);

        for (let i = 0; i < imageFilenames.length; i++) {
            const targetImageName = imageFilenames[i];

            const imageUrl = `/download/${safePath}/${encodeURIComponent(targetImageName)}?type=creader&v=${Date.now()}`;

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
            comicPageSwitcher.textContent = i + 1;

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
            document.querySelector("title").textContent = `Reading ${comicData.fullname} | Vanilla's Vault`;
        }

    } catch (error) {
        console.error("Error processing comic:", error);
        showErrorFrame("Error processing comic content. You will be redirected back in 5 seconds.");
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
    const distance = Math.abs(index - currentPageIndex);
    
    const baseDelay = distance >= 100 ? 0 : 0.25;

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

    switcherElements[index].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    
    pageInput.value = index + 1;

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
    const backBtn = document.querySelector("#comicBack");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            history.back();
        });
    }
});

if (pageInput) {
    pageInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            jumpToPageFromInput();
            pageInput.blur();
        }
    });

    pageInput.addEventListener("blur", () => {
        jumpToPageFromInput();
    });
}

function jumpToPageFromInput() {
    const pageVal = parseInt(pageInput.value, 10);
    if (!isNaN(pageVal)) {
        const targetIndex = pageVal - 1;
        if (targetIndex >= 0 && targetIndex < loadedPageElements.length) {
            switchPage(targetIndex);
            return;
        }
    }
    pageInput.value = currentPageIndex + 1;
}