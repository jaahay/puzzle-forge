import type { PuzzleId } from "../catalog/types";
import { puzzleIds } from "./sessionConstants";
import { loadPersistedPuzzleSessions } from "./sessionPersistence";

const selectedPuzzleIdStorageKey = "puzzle-forge.selected-puzzle-id";

const isPuzzleId = (value: string | null): value is PuzzleId => value !== null && puzzleIds.includes(value as PuzzleId);

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

export const markPuzzleNavigation = (puzzleId?: PuzzleId) => {
  if (typeof window === "undefined" || !puzzleId) {
    return;
  }

  window.localStorage.setItem(selectedPuzzleIdStorageKey, puzzleId);
};
