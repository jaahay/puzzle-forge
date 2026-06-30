const homeNavigationStorageKey = "puzzle-forge.home-navigation";
const selectedSurfaceStorageKey = "puzzle-forge.selected-surface";
const legacyLastHomeSelectionStorageKey = "puzzle-forge.last-home-selection";
const persistedSessionsMetadataStorageKey = "puzzle-forge.sessions.v1";
const persistedSessionStorageKeyPrefix = "puzzle-forge.session.v1.";

type SelectedSurface = "home" | "puzzle";

const setSelectedSurface = (surface: SelectedSurface) => {
  window.localStorage.setItem(selectedSurfaceStorageKey, surface);
  window.localStorage.removeItem(legacyLastHomeSelectionStorageKey);
};

const hasRestorablePuzzleSession = () => {
  const rawMetadata = window.localStorage.getItem(persistedSessionsMetadataStorageKey);

  if (!rawMetadata) {
    return false;
  }

  try {
    const metadata: unknown = JSON.parse(rawMetadata);

    if (typeof metadata !== "object" || metadata === null || !("activePuzzleId" in metadata)) {
      return false;
    }

    const activePuzzleId = (metadata as { activePuzzleId?: unknown }).activePuzzleId;

    return typeof activePuzzleId === "string" && window.localStorage.getItem(`${persistedSessionStorageKeyPrefix}${activePuzzleId}`) !== null;
  } catch {
    return false;
  }
};

export const shouldInitializePuzzleSurface = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const cameFromHomeAction = window.sessionStorage.getItem(homeNavigationStorageKey) === "1";
  const selectedSurface = window.localStorage.getItem(selectedSurfaceStorageKey);
  const legacyLastSelectionWasHome = window.localStorage.getItem(legacyLastHomeSelectionStorageKey) === "1";

  return selectedSurface === "puzzle" && !cameFromHomeAction && !legacyLastSelectionWasHome && hasRestorablePuzzleSession();
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
