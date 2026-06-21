const storagePrefix = "puzzle-forge:progress:v1";

const canUseLocalStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const getProgressStorageKey = (parts: Array<number | string | undefined>) =>
  [storagePrefix, ...parts.map((part) => String(part ?? "none"))].join(":");

export const readProgress = <T>(key: string): T | null => {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
};

export const writeProgress = <T>(key: string, value: T | null) => {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable or full. Progress persistence is best-effort.
  }
};
