export async function getComicMetadata(url) {
    const safePath = encodeURIComponent(url);
    const response = await fetch(`/download/${safePath}/comic.json?type=cr`);
    if (!response.ok) {
        throw new Error(`Failed to fetch comic.json: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}