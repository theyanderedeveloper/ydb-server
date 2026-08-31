const lerpFactor = 0.1;

const State = {
    isResizing: false,
    targetWidth: 250,
    currentWidth: 250,
    animationFrameId: null,
};

const el = (id) => document.getElementById(id);

const escapeHTML = (str) => {
    const p = document.createElement("p");
    p.textContent = str;
    return p.innerHTML;
};

const debounce = (fn, ms) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), ms);
    };
};

function updateSidebarWidth() {
    const diff = State.targetWidth - State.currentWidth;
    State.currentWidth += diff * lerpFactor;

    const sidebar = el("sidebar");
    if (sidebar) {
        sidebar.style.width = `${State.currentWidth}px`;
        sidebar.style.transition = `none`;
    }

    if (State.isResizing || Math.abs(diff) > 0.1) {
        State.animationFrameId = requestAnimationFrame(updateSidebarWidth);
    } else {
        State.currentWidth = State.targetWidth;
        if (sidebar) {
            sidebar.style.width = `${State.currentWidth}px`;
            sidebar.style.transition = ``;
        }
        State.animationFrameId = null;
    }
}

const targetWidthChange = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    State.targetWidth = Math.min(Math.max(clientX, 192), window.innerWidth * 0.8);
};

const targetWindowResizeWidthChange = () => {
    State.targetWidth = Math.min(Math.max(State.targetWidth, 192), window.innerWidth * 0.8);

    if (!State.animationFrameId) {
        State.animationFrameId = requestAnimationFrame(updateSidebarWidth);
    }
};

window.addEventListener("resize", targetWindowResizeWidthChange);

document.addEventListener('DOMContentLoaded', () => {
    
    document.querySelectorAll("a.frameBack").forEach((e) => {
        e.addEventListener("click", () => {
            history.back();
        });
    });

    const fullscreenBtn = document.querySelector('.fullScreen');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const targetSelector = fullscreenBtn.getAttribute('data-target');
            const targetElement = document.querySelector(targetSelector);

            if (!targetElement) return;

            if (!document.fullscreenElement) {
                targetElement.requestFullscreen()
                    .catch(err => {
                        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                    });
            } else {
                document.exitFullscreen();
            }
        });
    }

    const searchInput = el("file-search");
    if (searchInput) {
        searchInput.addEventListener(
            "input",
            debounce(() => {
                renderList(FileManConfig.cachedItems, FileManConfig.currentPath, false);
            }, 200),
        );
    }

    const resizer = el("resizer");
    if (resizer) {
        resizer.addEventListener("mousedown", (e) => {
            e.preventDefault();
            State.isResizing = true;
            document.body.classList.add("resizing-active");

            const onMouseUp = () => {
                State.isResizing = false;
                document.body.classList.remove("resizing-active");
                document.removeEventListener("mousemove", targetWidthChange);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", targetWidthChange);
            document.addEventListener("mouseup", onMouseUp);

            if (!State.animationFrameId) {
                State.animationFrameId = requestAnimationFrame(updateSidebarWidth);
            }
        });

        resizer.addEventListener(
            "touchstart",
            (e) => {
                State.isResizing = true;
                document.body.classList.add("resizing-active");

                const onTouchEnd = () => {
                    State.isResizing = false;
                    document.body.classList.remove("resizing-active");
                    document.removeEventListener("touchmove", targetWidthChange);
                    document.removeEventListener("touchend", onTouchEnd);
                };

                document.addEventListener("touchmove", targetWidthChange, { passive: false });
                document.addEventListener("touchend", onTouchEnd);

                if (!State.animationFrameId) {
                    State.animationFrameId = requestAnimationFrame(updateSidebarWidth);
                }
            },
            { passive: true },
        );
    }
});

function renderError(code, title, message) {
    const preview = el("preview");
    if (!preview) return;

    preview.innerHTML = `
        <div class="frame">
            <div class="frameHeader">
                <span class="frameID">${code} ${title}</span>
            </div>
            <div class="frameText">
                <p>${message}</p>
            </div>
            <div class="frameLinkList">
                <div class="frameLinkListItem" id="btn-refresh">
                    <span>🔄 REFRESH PAGE</span>
                </div>
                <div class="frameLinkListItem" id="btn-home">
                    <span>🏠 RETURN HOME</span>
                </div>
            </div>
        </div>
    `;

    const refreshBtn = document.getElementById("btn-refresh");
    const homeBtn = document.getElementById("btn-home");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            location.reload();
        });
    }

    if (homeBtn) {
        homeBtn.addEventListener("click", () => {
            fetchFiles("");
        });
    }
}

function handleErrorResponse(status, context) {
    const errorMap = {
        404: { title: "Not found", msg: `The requested item "${context}" does not exist.` },
        403: { title: "Forbidden", msg: "You do not have permission to access this resource." },
        416: { title: "Range error", msg: "The server couldn't stream the requested file chunk." },
        429: { title: "Too many requests", msg: "The server temporarily blocked your requests." },
        500: { title: "Server error", msg: "The server encountered an internal glitch." },
    };

    const error = errorMap[status] || { title: "UNKNOWN_ERROR", msg: "An unexpected error occurred." };
    
    renderError(status, error.title, error.msg);

    const previewEl = el("preview");
    if (previewEl) {
        const header = document.createElement("div");
        header.className = "preview-header";
        header.innerHTML = `<button onclick="closePreview()" class="preview-close-btn" title="Close preview">✕</button>`;
        
        previewEl.style.position = "relative"; 
        previewEl.insertBefore(header, previewEl.firstChild);
    }
}