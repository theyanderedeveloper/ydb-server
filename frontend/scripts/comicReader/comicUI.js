import { state } from "/scripts/comicReader/comicState";

export function showErrorFrame(message) {
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
        if (timerEl) timerEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(timerInterval);
            redirect();
        }
    }, 1000);
}

export function updateUrlPageParam(pageIndex) {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("page", pageIndex + 1);
    history.replaceState(null, '', window.location.pathname + '?' + queryParams.toString());
}

export function resizeComicPages() {
    state.loadedPageElements.forEach(imgElement => {
        const minDim = Math.min(window.innerHeight, window.innerWidth);
        let w = minDim, h = minDim;

        if (state.globalRatioX > state.globalRatioY) {
            h = (minDim / state.globalRatioX) * state.globalRatioY;
        } else if (state.globalRatioX < state.globalRatioY) {
            w = (minDim / state.globalRatioY) * state.globalRatioX;
        }

        imgElement.style.width = `${w}px`;
        imgElement.style.height = `${h}px`;
    });
}


export function handleLoadError(message) {
    document.querySelector("#comicHeader").style.display = "none";
    document.querySelector("#comicFooter").style.display = "none";
    showErrorFrame(message);
}