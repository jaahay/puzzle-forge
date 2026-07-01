import type { PuzzleId } from "../catalog/types";
import { puzzleIds } from "./sessionConstants";
import { loadPersistedPuzzleSessions } from "./sessionPersistence";

const homeNavigationStorageKey = "puzzle-forge.home-navigation";
const selectedSurfaceStorageKey = "puzzle-forge.selected-surface";
const selectedPuzzleIdStorageKey = "puzzle-forge.selected-puzzle-id";
const legacyLastHomeSelectionStorageKey = "puzzle-forge.last-home-selection";

type SelectedSurface = "home" | "puzzle";

const isPuzzleId = (value: string | null): value is PuzzleId => value !== null && puzzleIds.includes(value as PuzzleId);

const setSelectedSurface = (surface: SelectedSurface) => {
  window.localStorage.setItem(selectedSurfaceStorageKey, surface);
  window.localStorage.removeItem(legacyLastHomeSelectionStorageKey);
};

const getStoredSelectedPuzzleId = () => {
  const storedPuzzleId = window.localStorage.getItem(selectedPuzzleIdStorageKey);
  return isPuzzleId(storedPuzzleId) ? storedPuzzleId : null;
};

export const getInitialSelectedPuzzleId = (fallback: PuzzleId = "sudoku") => {
  if (typeof window === "undefined") {
    return fallback;
  }

  return loadPersistedPuzzleSessions()?.activePuzzleId ?? getStoredSelectedPuzzleId() ?? fallback;
};

export const shouldInitializePuzzleSurface = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const cameFromHomeAction = window.sessionStorage.getItem(homeNavigationStorageKey) === "1";
  const selectedSurface = window.localStorage.getItem(selectedSurfaceStorageKey);
  const legacyLastSelectionWasHome = window.localStorage.getItem(legacyLastHomeSelectionStorageKey) === "1";
  const hasRestorablePuzzle = loadPersistedPuzzleSessions() !== null || getStoredSelectedPuzzleId() !== null;

  return selectedSurface === "puzzle" && !cameFromHomeAction && !legacyLastSelectionWasHome && hasRestorablePuzzle;
};

export const markHomeNavigation = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(homeNavigationStorageKey, "1");
  setSelectedSurface("home");
};

export const markPuzzleNavigation = (puzzleId?: PuzzleId) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(homeNavigationStorageKey);
  setSelectedSurface("puzzle");

  if (puzzleId) {
    window.localStorage.setItem(selectedPuzzleIdStorageKey, puzzleId);
  }
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
