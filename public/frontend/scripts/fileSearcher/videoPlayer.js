export function injectMediaControls(filePath, videoElement) {
    const container = document.createElement("div");
    container.className = "media-controls";
    container.innerHTML = `
        <label for="quality-switcher">Select Quality:</label>
        <select id="quality-switcher">
            ${["unedited", "1080p", "720p", "360p"]
            .map(res => `<option value="${res}" ${res === "720p" ? "selected" : ""}>${res.toLowerCase()}</option>`).join("")}
        </select>`;

    videoElement.after(container);
    container.querySelector("#quality-switcher").addEventListener("change", (e) => {
        loadVideo(filePath, e.target.value, document.getElementById("video-player")?.currentTime || 0);
    });
}

export const loadVideo = (filePath, res = "720p", startTime = 0) => {
    const video = document.getElementById("video-player");
    if (!video || !window.Hls || !Hls.isSupported()) return;

    window.hlsInstance?.destroy();

    const base = `/download/${filePath}/${res}/`;
    const CustomLoader = class extends Hls.DefaultConfig.loader {
        load(context, config, callbacks) {
            if (/\.(ts|m4s)(\?.*)?$/i.test(context.url)) {
                const fileName = context.url.split("/").pop().split("?")[0];
                context.url = `${base}${fileName}?type=videopreviews`;
            }
            super.load(context, config, callbacks);
        }
    };

    const hls = new Hls({ fLoader: CustomLoader });
    window.hlsInstance = hls;
    hls.loadSource(`${base}preview.m3u8?type=vid`);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.currentTime = startTime;
        video.play().catch(error => {
            console.warn("Autoplay blocked by browser policy:", error);
        });
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        hls.destroy();
        video.removeAttribute("src");
        video.load();
        video.textContent = "Video loading failed.";
    });
};