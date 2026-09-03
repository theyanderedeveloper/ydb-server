export function injectMediaControls(filePath, videoElement) {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'media-controls';

    controlsContainer.innerHTML = `
    <div class="quality-control">
        <label for="quality-switcher">Select Quality:</label>
        <select id="quality-switcher" name="quality-switcher">
            <option value="raw">Raw (Source)</option>
            <option value="1080p">1080p (FHD)</option>
            <option value="720p" selected>720p (HD)</option>
            <option value="480p">480p</option>
            <option value="360p">360p</option>
            <option value="240p">240p</option>
            <option value="144p">144p</option>
        </select>
    </div>`;

    videoElement.parentNode.insertBefore(controlsContainer, videoElement.nextSibling);

    const switcher = controlsContainer.querySelector('#quality-switcher');
    switcher.addEventListener('change', (e) => {
        const video = document.getElementById('video-player');
        loadVideo(filePath, e.target.value, video.currentTime);
    });
}

export const loadVideo = (filePath, res = '720p', startTime = 0) => {
    const video = document.getElementById('video-player');
    if (!video) return;
    
    const manifestUrl = `/previews/${filePath}/${res}/preview.m3u8`;
    const segmentsBaseUrl = `/previews/${filePath}/${res}/`;

    if (window.Hls && Hls.isSupported()) {
        if (window.hlsInstance) window.hlsInstance.destroy();

        const CustomLoader = class extends Hls.DefaultConfig.loader {
            load(context, config, callbacks) {
                if (context.url.endsWith('.ts') || context.url.endsWith('.m4s')) {
                    const fileName = context.url.split('/').pop();
                    context.url = `${segmentsBaseUrl}${fileName}`;
                }
                super.load(context, config, callbacks);
            }
        };

        const hls = new Hls({ fLoader: CustomLoader });
        window.hlsInstance = hls;
        hls.loadSource(manifestUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.currentTime = startTime;
            video.play();
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                hls.destroy();
                video.removeAttribute('src');
                video.load();
                video.textContent = 'Video loading failed.';
            }
        });
    }
};