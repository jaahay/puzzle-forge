const homeNavigationStorageKey = "puzzle-forge.home-navigation";
const lastHomeSelectionStorageKey = "puzzle-forge.last-home-selection";

export const markHomeNavigation = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(homeNavigationStorageKey, "1");
  window.localStorage.setItem(lastHomeSelectionStorageKey, "1");
};

export const markPuzzleNavigation = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(homeNavigationStorageKey);
  window.localStorage.removeItem(lastHomeSelectionStorageKey);
};

export const consumeHomeNavigation = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const cameFromHomeAction = window.sessionStorage.getItem(homeNavigationStorageKey) === "1";
  const lastSelectionWasHome = window.localStorage.getItem(lastHomeSelectionStorageKey) === "1";

  window.sessionStorage.removeItem(homeNavigationStorageKey);
  return cameFromHomeAction || lastSelectionWasHome;
};
