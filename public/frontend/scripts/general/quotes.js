import { language } from "/scripts/general/state";

export async function setQuotes() {
    const quoteCache = {};
    const fetchPromises = {};
    const quouteObjects = document.querySelectorAll(".quoteRandom");

    for (const quP of quouteObjects) {
        const category = quP.dataset.quote || "default";
        quP.textContent = "Loading...";

        (async () => {
            try {
                if (!quoteCache[category]) {
                    if (!fetchPromises[category]) {
                        fetchPromises[category] = fetch(`/resources/quotes/${language}/${category}`)
                            .then(res => res.ok ? res.json() : null)
                            .catch(() => null);
                    }
                    quoteCache[category] = await fetchPromises[category];
                }

                const quoteList = quoteCache[category];
                if (Array.isArray(quoteList) && quoteList.length > 0) {
                    const randomIndex = Math.floor(Math.random() * quoteList.length);
                    const item = quoteList[randomIndex];
                    quP.innerHTML = typeof item === 'object' && item !== null ? item.text : item;
                } else {
                    quP.remove();
                }
            } catch (error) {
                console.error(`Could not load quotes for category: ${category}`, error);
                quP.remove();
            }
        })();
    }
}