export const FileManConfig = {
    currentPath: "",
    currentPreviewPath: "",
    cachedItems: [],
    sortBy: "name",
    sortOrder: "asc",
};

export var iconMap = {};
export var EXT = { 
    image: new Set(), 
    video: new Set(), 
    audio: new Set(), 
    archive: new Set(), 
    document: new Set(), 
    text: new Set() 
};

export const setIconMap = (m) => (iconMap = m);
export const setEXTMap = (m) => {
    EXT = Object.fromEntries(
        Object.entries(m).map(([k, v]) => [k, v instanceof Set ? v : new Set(v)])
    );
};