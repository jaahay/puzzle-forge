import type { PuzzleCell } from "../catalog/types";
import { cloneGridCell, type GridCellSelection } from "../interactions/gridRules";

export const gridHistoryLimit = 120;

export type GridHistoryEntry = {
  cells: PuzzleCell[];
  selectedGridCell: GridCellSelection | null;
};

export type GridHistoryState = {
  undoStack: GridHistoryEntry[];
  redoStack: GridHistoryEntry[];
};

export type GridHistoryTransition = {
  entry: GridHistoryEntry;
  history: GridHistoryState;
};

export const makeEmptyGridHistoryState = (): GridHistoryState => ({
  undoStack: [],
  redoStack: [],
});

export const cloneGridHistoryEntry = (entry: GridHistoryEntry): GridHistoryEntry => ({
  cells: entry.cells.map(cloneGridCell),
  selectedGridCell: entry.selectedGridCell ? { ...entry.selectedGridCell } : null,
});

export const makeGridHistoryEntry = (
  cells: PuzzleCell[],
  selectedGridCell: GridCellSelection | null,
): GridHistoryEntry => cloneGridHistoryEntry({ cells, selectedGridCell });

export const sameGridPlayerState = (left: PuzzleCell[], right: PuzzleCell[]) =>
  left.length === right.length &&
  left.every((cell, index) => {
    const other = right[index];
    return Boolean(
      other &&
      cell.row === other.row &&
      cell.column === other.column &&
      cell.value === other.value &&
      cell.locked === other.locked,
    );
  });

export const pushGridHistoryEntry = (
  history: GridHistoryState,
  entry: GridHistoryEntry,
): GridHistoryState => ({
  undoStack: [...history.undoStack, cloneGridHistoryEntry(entry)].slice(-gridHistoryLimit),
  redoStack: [],
});

export const undoGridHistory = (
  history: GridHistoryState,
  current: GridHistoryEntry,
): GridHistoryTransition | null => {
  const previous = history.undoStack[history.undoStack.length - 1];
  if (!previous) return null;

  return {
    entry: cloneGridHistoryEntry(previous),
    history: {
      undoStack: history.undoStack.slice(0, -1),
      redoStack: [...history.redoStack, cloneGridHistoryEntry(current)].slice(-gridHistoryLimit),
    },
  };
};

export const redoGridHistory = (
  history: GridHistoryState,
  current: GridHistoryEntry,
): GridHistoryTransition | null => {
  const next = history.redoStack[history.redoStack.length - 1];
  if (!next) return null;

  return {
    entry: cloneGridHistoryEntry(next),
    history: {
      undoStack: [...history.undoStack, cloneGridHistoryEntry(current)].slice(-gridHistoryLimit),
      redoStack: history.redoStack.slice(0, -1),
    },
  };
};
