export const state = {
    comicData: null,
    currentPageIndex: 0,
    globalRatioX: 1,
    globalRatioY: 1,
    loadedPageElements: [],
    switcherElements: []
};

export function setCurrentPageIndex(index) {
    state.currentPageIndex = index;
}

export function setComicData(data) {
    state.comicData = data;
}

export function setRatios(x, y) {
    state.globalRatioX = x;
    state.globalRatioY = y;
}