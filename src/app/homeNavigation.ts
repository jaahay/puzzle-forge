import type { PuzzleId } from "../catalog/types";
import { loadPersistedPuzzleSessions } from "./session";
import { puzzleIds } from "./sessionConstants";

const selectedPuzzleIdStorageKey = "puzzle-forge.selected-puzzle-id";

const isPuzzleId = (value: string | null): value is PuzzleId => value !== null && puzzleIds.includes(value as PuzzleId);

const getStoredSelectedPuzzleId = () => {
  try {
    const storedPuzzleId = window.localStorage.getItem(selectedPuzzleIdStorageKey);
    return isPuzzleId(storedPuzzleId) ? storedPuzzleId : null;
  } catch {
    return null;
  }
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

  try {
    window.localStorage.setItem(selectedPuzzleIdStorageKey, puzzleId);
  } catch {
    // Navigation remains usable without browser storage.
  }
};
