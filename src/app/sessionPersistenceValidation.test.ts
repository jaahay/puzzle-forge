import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle, PuzzleCell } from "../catalog/types";
import {
  buildPersistedPuzzleSession,
  initialSolitaireStats,
  loadPersistedPuzzleSessions,
  type PuzzleSession,
} from "./session";

const metadataStorageKey = "puzzle-forge.sessions.v1";
const sudokuStorageKey = "puzzle-forge.session.v1.sudoku";

const makeSudokuPuzzle = (): GeneratedPuzzle => ({
  id: "sudoku-validation",
  puzzleId: "sudoku",
  title: "Sudoku",
  seed: "validation-seed",
  width: 9,
  height: 9,
  checksum: "checksum",
  createdAt: "2026-08-29T00:00:00.000Z",
  difficulty: "Medium",
  uniqueSolution: true,
  sudokuVariation: "classic",
  notes: [],
  kind: "grid",
  cells: [],
});

const makeGridCells = (): PuzzleCell[] => [
  { row: 0, column: 0, value: "1", locked: true, tone: "given", ariaLabel: "1 cell" },
  { row: 0, column: 1, value: "", locked: false, tone: "empty", ariaLabel: "Empty cell" },
];

const makeSudokuSession = (): PuzzleSession => ({
  seed: "validation-seed",
  width: 9,
  height: 9,
  difficulty: "Medium",
  requireUniqueSolution: true,
  sudokuVariation: "classic",
  puzzle: makeSudokuPuzzle(),
  cardStacks: null,
  selectedCard: null,
  solitaireStats: { ...initialSolitaireStats },
  solitaireUndoStack: [],
  solitaireRedoStack: [],
  gridCells: makeGridCells(),
  selectedGridCell: { row: 0, column: 1 },
  statusMessage: "In progress.",
});

const withMockWindowStorage = (run: (storage: Map<string, string>) => void) => {
  const storage = new Map<string, string>();
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    },
  });

  try {
    run(storage);
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
};

const writeSession = (storage: Map<string, string>, session: unknown) => {
  storage.set(metadataStorageKey, JSON.stringify({
    schemaVersion: 1,
    activePuzzleId: "sudoku",
    savedPuzzleIds: ["sudoku"],
    updatedAt: "2026-08-29T00:00:00.000Z",
  }));
  storage.set(sudokuStorageKey, JSON.stringify(session));
};

describe("persisted session boundary validation", () => {
  it("accepts a valid compact grid session", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
      expect(persisted).not.toBeNull();
      writeSession(storage, persisted);

      expect(loadPersistedPuzzleSessions()?.sessions.sudoku).toEqual(persisted);
    });
  });

  it("rejects invalid identity primitives instead of trusting JSON shape", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
      expect(persisted).not.toBeNull();

      writeSession(storage, { ...persisted, difficulty: "Impossible" });
      expect(loadPersistedPuzzleSessions()).toBeNull();

      writeSession(storage, { ...persisted, width: -9 });
      expect(loadPersistedPuzzleSessions()).toBeNull();

      writeSession(storage, { ...persisted, completedAt: 42 });
      expect(loadPersistedPuzzleSessions()).toBeNull();
    });
  });

  it("rejects malformed grid cells and selections", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
      expect(persisted?.progress.kind).toBe("grid");
      if (!persisted || persisted.progress.kind !== "grid") return;

      writeSession(storage, {
        ...persisted,
        progress: {
          ...persisted.progress,
          cells: [{ ...persisted.progress.cells[0], tone: "corrupt" }],
        },
      });
      expect(loadPersistedPuzzleSessions()).toBeNull();

      writeSession(storage, {
        ...persisted,
        progress: {
          ...persisted.progress,
          selectedCell: { row: -1, column: 0 },
        },
      });
      expect(loadPersistedPuzzleSessions()).toBeNull();
    });
  });

  it("rejects malformed tile-order records before restore code can consume them", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
      expect(persisted).not.toBeNull();

      writeSession(storage, {
        ...persisted,
        progress: {
          kind: "tiles",
          tileOrder: [{ id: "tile-1", currentIndex: -1 }],
          selectedTileId: null,
        },
      });
      expect(loadPersistedPuzzleSessions()).toBeNull();
    });
  });
});
