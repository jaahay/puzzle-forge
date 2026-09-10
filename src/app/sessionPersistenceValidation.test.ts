import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { getPuzzleProvenance, withPuzzleProvenance } from "./puzzleProvenance";
import {
  buildPersistedPuzzleSession,
  loadPersistedPuzzleSessions,
  restorePuzzleSessionFromPersisted,
  type PersistedPuzzleSession,
  type PuzzleSession,
} from "./session";

const metadataStorageKey = "puzzle-forge.sessions.v1";
const sudokuStorageKey = "puzzle-forge.session.v1.sudoku";

const makeGridCells = (): PuzzleCell[] => [
  { row: 0, column: 0, value: "1", locked: true, tone: "given", ariaLabel: "1 cell" },
  { row: 0, column: 1, value: "", locked: false, tone: "empty", ariaLabel: "Empty cell" },
];

const makeSudokuPuzzle = (): GridGeneratedPuzzle => ({
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
  cells: makeGridCells(),
});

const makeSudokuSession = (): PuzzleSession => ({
  kind: "grid",
  puzzle: makeSudokuPuzzle(),
  progress: {
    kind: "grid",
    cells: makeGridCells(),
    selectedCell: { row: 0, column: 1 },
  },
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

  it("writes compact grid undo/redo history and restores rich runtime snapshots", () => {
    const session = makeSudokuSession();
    if (session.progress.kind !== "grid") return;
    session.progress.undoStack = [{
      cells: makeGridCells().map((cell) => cell.column === 1 ? { ...cell, value: "4" } : cell),
      selectedGridCell: { row: 0, column: 1 },
    }];
    session.progress.redoStack = [{
      cells: makeGridCells().map((cell) => cell.column === 1 ? { ...cell, value: "7" } : cell),
      selectedGridCell: null,
    }];

    const persisted = buildPersistedPuzzleSession("sudoku", session);
    expect(persisted?.progress.kind).toBe("grid");
    if (!persisted || persisted.progress.kind !== "grid") return;
    expect(persisted.progress.history?.undo[0]).toEqual({ values: ["4"], selectedCellIndex: 1 });
    expect(persisted.progress.history?.redo[0]).toEqual({ values: ["7"], selectedCellIndex: null });
    expect(persisted.progress.undoStack).toBeUndefined();
    expect(persisted.progress.redoStack).toBeUndefined();

    const restored = restorePuzzleSessionFromPersisted(persisted, makeSudokuPuzzle());
    expect(restored?.progress.kind).toBe("grid");
    if (!restored || restored.progress.kind !== "grid") return;
    expect(restored.progress.undoStack?.[0].cells[1].value).toBe("4");
    expect(restored.progress.undoStack?.[0].selectedGridCell).toEqual({ row: 0, column: 1 });
    expect(restored.progress.redoStack?.[0].cells[1].value).toBe("7");
  });

  it("loads and restores legacy rich grid history", () => {
    withMockWindowStorage((storage) => {
      const current = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
      expect(current?.progress.kind).toBe("grid");
      if (!current || current.progress.kind !== "grid") return;

      const legacy: PersistedPuzzleSession = {
        ...current,
        progress: {
          kind: "grid",
          cells: current.progress.cells,
          selectedCell: current.progress.selectedCell,
          undoStack: [{
            cells: makeGridCells().map((cell) => cell.column === 1 ? { ...cell, value: "4" } : cell),
            selectedGridCell: { row: 0, column: 1 },
          }],
          redoStack: [{
            cells: makeGridCells().map((cell) => cell.column === 1 ? { ...cell, value: "7" } : cell),
            selectedGridCell: null,
          }],
        },
      };
      writeSession(storage, legacy);

      const loaded = loadPersistedPuzzleSessions()?.sessions.sudoku;
      expect(loaded?.progress.kind).toBe("grid");
      if (!loaded || loaded.progress.kind !== "grid") return;
      expect(loaded.progress.history).toBeUndefined();
      expect(loaded.progress.undoStack?.[0].cells[1].value).toBe("4");

      const restored = restorePuzzleSessionFromPersisted(loaded, makeSudokuPuzzle());
      expect(restored?.progress.kind).toBe("grid");
      if (!restored || restored.progress.kind !== "grid") return;
      expect(restored.progress.undoStack?.[0].cells[1].value).toBe("4");
      expect(restored.progress.undoStack?.[0].selectedGridCell).toEqual({ row: 0, column: 1 });
      expect(restored.progress.redoStack?.[0].cells[1].value).toBe("7");
    });
  });

  it("persists explicit daily provenance independently of the seed string", () => {
    const session = makeSudokuSession();
    session.puzzle = withPuzzleProvenance(session.puzzle, {
      source: "daily",
      dateStamp: "2026-08-29",
    }) as GridGeneratedPuzzle;

    const persisted = buildPersistedPuzzleSession("sudoku", session);
    expect(persisted?.provenance).toEqual({ source: "daily", dateStamp: "2026-08-29" });

    const restored = persisted
      ? restorePuzzleSessionFromPersisted(persisted, makeSudokuPuzzle())
      : null;
    expect(restored).not.toBeNull();
    if (!restored) return;
    expect(getPuzzleProvenance(restored.puzzle)).toEqual({ source: "daily", dateStamp: "2026-08-29" });
    expect(restored.puzzle.seed).toBe("validation-seed");
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

      writeSession(storage, { ...persisted, provenance: { source: "daily", dateStamp: "not-a-date" } });
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

  it("rejects malformed compact and legacy grid history entries", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
      expect(persisted?.progress.kind).toBe("grid");
      if (!persisted || persisted.progress.kind !== "grid") return;

      writeSession(storage, {
        ...persisted,
        progress: {
          ...persisted.progress,
          history: { version: 1, undo: [{ values: ["4"], selectedCellIndex: -1 }], redo: [] },
        },
      });
      expect(loadPersistedPuzzleSessions()).toBeNull();

      writeSession(storage, {
        ...persisted,
        progress: {
          ...persisted.progress,
          undoStack: [{ cells: persisted.progress.cells, selectedGridCell: { row: -1, column: 0 } }],
        },
      });
      expect(loadPersistedPuzzleSessions()).toBeNull();
    });
  });

  it("rejects structurally valid progress of the wrong kind for the puzzle type", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
      expect(persisted).not.toBeNull();

      writeSession(storage, {
        ...persisted,
        progress: {
          kind: "tiles",
          tileOrder: [],
          selectedTileId: null,
        },
      });

      expect(loadPersistedPuzzleSessions()).toBeNull();
    });
  });

  it("rejects duplicate or incomplete grid coordinates when restoring regenerated identity", () => {
    const puzzle = makeSudokuPuzzle();
    const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
    expect(persisted?.progress.kind).toBe("grid");
    if (!persisted || persisted.progress.kind !== "grid") return;

    const duplicateCoordinates: PersistedPuzzleSession = {
      ...persisted,
      progress: {
        ...persisted.progress,
        cells: [persisted.progress.cells[0], { ...persisted.progress.cells[1], row: 0, column: 0 }],
      },
    };
    const incompleteCoordinates: PersistedPuzzleSession = {
      ...persisted,
      progress: {
        ...persisted.progress,
        cells: [persisted.progress.cells[0]],
      },
    };

    expect(restorePuzzleSessionFromPersisted(duplicateCoordinates, puzzle)).toBeNull();
    expect(restorePuzzleSessionFromPersisted(incompleteCoordinates, puzzle)).toBeNull();
  });

  it("rejects a selected grid coordinate that does not exist on the regenerated board", () => {
    const puzzle = makeSudokuPuzzle();
    const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
    expect(persisted?.progress.kind).toBe("grid");
    if (!persisted || persisted.progress.kind !== "grid") return;

    expect(restorePuzzleSessionFromPersisted({
      ...persisted,
      progress: {
        ...persisted.progress,
        selectedCell: { row: 8, column: 8 },
      },
    }, puzzle)).toBeNull();
  });
});
