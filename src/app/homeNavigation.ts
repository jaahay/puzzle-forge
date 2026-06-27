const homeNavigationStorageKey = "puzzle-forge.home-navigation";
const selectedSurfaceStorageKey = "puzzle-forge.selected-surface";
const legacyLastHomeSelectionStorageKey = "puzzle-forge.last-home-selection";

type SelectedSurface = "home" | "puzzle";

const setSelectedSurface = (surface: SelectedSurface) => {
  window.localStorage.setItem(selectedSurfaceStorageKey, surface);
  window.localStorage.removeItem(legacyLastHomeSelectionStorageKey);
};

export const markHomeNavigation = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(homeNavigationStorageKey, "1");
  setSelectedSurface("home");
};

export const markPuzzleNavigation = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(homeNavigationStorageKey);
  setSelectedSurface("puzzle");
};

export const consumeHomeNavigation = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const cameFromHomeAction = window.sessionStorage.getItem(homeNavigationStorageKey) === "1";
  const selectedSurface = window.localStorage.getItem(selectedSurfaceStorageKey);
  const legacyLastSelectionWasHome = window.localStorage.getItem(legacyLastHomeSelectionStorageKey) === "1";
  const shouldRestoreHome = cameFromHomeAction || selectedSurface === "home" || legacyLastSelectionWasHome;

  window.sessionStorage.removeItem(homeNavigationStorageKey);

  if (legacyLastSelectionWasHome) {
    setSelectedSurface(shouldRestoreHome ? "home" : "puzzle");
  }

  return shouldRestoreHome;
};
