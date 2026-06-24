const homeNavigationStorageKey = "puzzle-forge.home-navigation";

export const markHomeNavigation = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(homeNavigationStorageKey, "1");
};

export const consumeHomeNavigation = () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.sessionStorage.getItem(homeNavigationStorageKey) !== "1") {
    return false;
  }

  window.sessionStorage.removeItem(homeNavigationStorageKey);
  return true;
};
