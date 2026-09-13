import { State, lerpFactor } from "/scripts/general/state";
import { el } from "/scripts/general/utils";

export function updateSidebarWidth() {
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

export const targetWidthChange = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    State.targetWidth = Math.max(128, Math.min(768, clientX, window.innerWidth * 0.5));
};

export const targetWindowResizeWidthChange = () => {
    State.targetWidth = Math.max(128, Math.min(768, State.targetWidth, window.innerWidth * 0.5));


    if (!State.animationFrameId) {
        State.animationFrameId = requestAnimationFrame(updateSidebarWidth);
    }
};

export function initSidebar() {
    window.addEventListener("resize", targetWindowResizeWidthChange);

    const resizer = el("resizer");
    if (!resizer) return;

    const touchOptions = { passive: false };

    resizer.addEventListener("mousedown", (e) => {
        e.preventDefault();
        State.isResizing = true;
        document.body.classList.add("resizing-active");

        const onMouseMove = (moveEvent) => targetWidthChange(moveEvent);
        const onMouseUp = () => {
            State.isResizing = false;
            document.body.classList.remove("resizing-active");
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);

        if (!State.animationFrameId) {
            State.animationFrameId = requestAnimationFrame(updateSidebarWidth);
        }
    });

    resizer.addEventListener("touchstart", (e) => {
        State.isResizing = true;
        document.body.classList.add("resizing-active");

        const onTouchMove = (moveEvent) => {
            if (moveEvent.cancelable) moveEvent.preventDefault();
            targetWidthChange(moveEvent);
        };

        const onTouchEnd = () => {
            State.isResizing = false;
            document.body.classList.remove("resizing-active");
            document.removeEventListener("touchmove", onTouchMove, touchOptions);
            document.removeEventListener("touchend", onTouchEnd);
        };

        document.addEventListener("touchmove", onTouchMove, touchOptions);
        document.addEventListener("touchend", onTouchEnd);

        if (!State.animationFrameId) {
            State.animationFrameId = requestAnimationFrame(updateSidebarWidth);
        }
    }, { passive: true });
}