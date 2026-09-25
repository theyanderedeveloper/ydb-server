export const lerpFactor = 0.1;

export let language = localStorage.getItem("language") || "en_us";

export const State = {
    isResizing: false,
    targetWidth: 250,
    currentWidth: 250,
    animationFrameId: null,
};