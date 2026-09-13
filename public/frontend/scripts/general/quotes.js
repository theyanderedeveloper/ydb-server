import { language } from "/scripts/general/state";

const quoteCache = {};
const fetchPromises = {};

function transitionDimensions(element, updateCallback) {
    const startWidth = element.offsetWidth;
    const startHeight = element.offsetHeight;

    element.style.width = `${startWidth}px`;
    element.style.height = `${startHeight}px`;

    updateCallback();

    element.style.width = "auto";
    element.style.height = "auto";
    const targetWidth = element.offsetWidth;
    const targetHeight = element.offsetHeight;

    element.style.width = `${startWidth}px`;
    element.style.height = `${startHeight}px`;

    void element.offsetWidth;

    element.style.width = `${targetWidth}px`;
    element.style.height = `${targetHeight}px`;

    const cleanUp = (e) => {
        if (e.propertyName === "width" || e.propertyName === "height") {
            element.style.width = "";
            element.style.height = "";
            element.removeEventListener("transitionend", cleanUp);
        }
    };
    element.addEventListener("transitionend", cleanUp);
}

export async function setQuotes() {
    const quoteObjects = document.querySelectorAll(".quoteRandom");

    for (const quP of quoteObjects) {
        const category = quP.dataset.quote || "default";
        quP.classList.add("loading");
        quP.textContent = "Loading...";

        const renderRandomQuote = async (quoteList) => {
            if (!Array.isArray(quoteList) || quoteList.length === 0) {
                quP.remove();
                return;
            }

            transitionDimensions(quP, () => {
                quP.classList.add("loading");
                quP.textContent = "Loading...";
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            const randomIndex = Math.floor(Math.random() * quoteList.length);
            const item = quoteList[randomIndex];
            const content = typeof item === 'object' && item !== null ? item.text : item;

            transitionDimensions(quP, () => {
                quP.innerHTML = content;
                quP.classList.remove("loading");
            });
        };

        if (!quP.dataset.listenerAttached) {
            quP.dataset.listenerAttached = "true";
            quP.addEventListener("click", async (event) => {
                const range = document.createRange();
                const walker = document.createTreeWalker(quP, NodeFilter.SHOW_TEXT, null, false);
                let textNode;
                let isOnText = false;

                while ((textNode = walker.nextNode())) {
                    if (textNode.nodeValue.trim()) {
                        range.selectNodeContents(textNode);
                        const rects = range.getClientRects();
                        for (const rect of rects) {
                            if (
                                event.clientX >= rect.left &&
                                event.clientX <= rect.right &&
                                event.clientY >= rect.top &&
                                event.clientY <= rect.bottom
                            ) {
                                isOnText = true;
                                break;
                            }
                        }
                    }
                    if (isOnText) break;
                }
                range.detach();

                if (!isOnText && quoteCache[category]) {
                    await renderRandomQuote(quoteCache[category]);
                }
            });
        } (async () => {
            try {
                if (!quoteCache[category]) {
                    if (!fetchPromises[category]) {
                        fetchPromises[category] = fetch(`/resources/text/${language}/splash/${category}`)
                            .then(res => res.ok ? res.json() : null)
                            .catch(() => null);
                    }
                    quoteCache[category] = await fetchPromises[category];
                }

                await renderRandomQuote(quoteCache[category]);
            } catch (error) {
                console.error(`Could not load quotes for category: ${category}`, error);
                quP.remove();
            }
        })();
    }
}