export const FileManConfig = {
    currentPath: "",
    currentPreviewPath: "",
    cachedItems: [],
    sortBy: "name",
    sortOrder: "asc",
};

export let iconMap = {};

export function setIconMap(newMap) {
    iconMap = newMap;
}