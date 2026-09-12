import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { deserializePuzzle } from "./puzzleSerialization";
import { getPuzzleProvenance, withPuzzleProvenance } from "./puzzleProvenance";
import {
  buildPersistedPuzzleSession,
  loadPersistedPuzzleSessions,
  restorePuzzleSessionFromPersisted,
  type PersistedPuzzleSession,
  type PuzzleSession,
} from "./session";

const metadataStorageKey = "puzzle-forge.sessions";
const sudokuStorageKey = "puzzle-forge.session.sudoku";

const makeGridCells = (): PuzzleCell[] =>
  Array.from({ length: 81 }, (_, index) => {
    const row = Math.floor(index / 9);
    const column = index % 9;
    const locked = index === 0;
    return {
      row,
      column,
      value: locked ? "1" : "",
      locked,
      tone: locked ? "given" as const : "empty" as const,
      ariaLabel: locked
        ? `Given 1 at row ${row + 1}, column ${column + 1}`
        : `Empty Sudoku cell at row ${row + 1}, column ${column + 1}`,
    };
  });

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
      cells: makeGridCells().map((cell) => cell.row === 0 && cell.column === 1 ? { ...cell, value: "4" } : cell),
      selectedGridCell: { row: 0, column: 1 },
    }];
    session.progress.redoStack = [{
      cells: makeGridCells().map((cell) => cell.row === 0 && cell.column === 1 ? { ...cell, value: "7" } : cell),
      selectedGridCell: null,
    }];

    const persisted = buildPersistedPuzzleSession("sudoku", session);
    expect(persisted?.progress.kind).toBe("grid");
    if (!persisted || persisted.progress.kind !== "grid") return;
    expect(persisted.progress.history?.undo[0]?.values).toHaveLength(80);
    expect(persisted.progress.history?.undo[0]?.values[0]).toBe("4");
    expect(persisted.progress.history?.undo[0]?.selectedCellIndex).toBe(1);
    expect(persisted.progress.history?.redo[0]?.values[0]).toBe("7");
    expect(persisted.progress.history?.redo[0]?.selectedCellIndex).toBeNull();

    const restored = restorePuzzleSessionFromPersisted(persisted);
    expect(restored?.progress.kind).toBe("grid");
    if (!restored || restored.progress.kind !== "grid") return;
    expect(restored.progress.undoStack?.[0].cells[1].value).toBe("4");
    expect(restored.progress.undoStack?.[0].selectedGridCell).toEqual({ row: 0, column: 1 });
    expect(restored.progress.redoStack?.[0].cells[1].value).toBe("7");
  });

  it("persists explicit daily provenance inside the materialized puzzle", () => {
    const session = makeSudokuSession();
    session.puzzle = withPuzzleProvenance(session.puzzle, {
      source: "daily",
      dateStamp: "2026-08-29",
    }) as GridGeneratedPuzzle;

    const persisted = buildPersistedPuzzleSession("sudoku", session);
    expect(persisted).not.toBeNull();
    if (!persisted) return;

    const decoded = deserializePuzzle(persisted.puzzle);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(getPuzzleProvenance(decoded.puzzle)).toEqual({ source: "daily", dateStamp: "2026-08-29" });
    }

    const restored = restorePuzzleSessionFromPersisted(persisted);
    expect(restored).not.toBeNull();
    if (!restored) return;
    expect(getPuzzleProvenance(restored.puzzle)).toEqual({ source: "daily", dateStamp: "2026-08-29" });
    expect(restored.puzzle.seed).toBe("validation-seed");
  });

  it("rejects invalid materialized puzzle data and session metadata", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
      expect(persisted).not.toBeNull();
      if (!persisted) return;

      writeSession(storage, { ...persisted, puzzle: "not-a-puzzle" });
      expect(loadPersistedPuzzleSessions()).toBeNull();

      writeSession(storage, { ...persisted, puzzleId: "nonogram" });
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

  it("rejects malformed compact grid history entries", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
      expect(persisted?.progress.kind).toBe("grid");
      if (!persisted || persisted.progress.kind !== "grid") return;

      writeSession(storage, {
        ...persisted,
        progress: {
          ...persisted.progress,
          history: { undo: [{ values: Array.from({ length: 80 }, () => ""), selectedCellIndex: -1 }], redo: [] },
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

  it("rejects duplicate or incomplete grid coordinates when restoring progress", () => {
    const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
    expect(persisted?.progress.kind).toBe("grid");
    if (!persisted || persisted.progress.kind !== "grid") return;

    const duplicateCoordinates: PersistedPuzzleSession = {
      ...persisted,
      progress: {
        ...persisted.progress,
        cells: persisted.progress.cells.map((cell, index) =>
          index === 1 ? { ...cell, row: 0, column: 0 } : cell,
        ),
      },
    };
    const incompleteCoordinates: PersistedPuzzleSession = {
      ...persisted,
      progress: {
        ...persisted.progress,
        cells: persisted.progress.cells.slice(0, -1),
      },
    };

    expect(restorePuzzleSessionFromPersisted(duplicateCoordinates)).toBeNull();
    expect(restorePuzzleSessionFromPersisted(incompleteCoordinates)).toBeNull();
  });

  it("rejects a selected grid coordinate that does not exist on the materialized board", () => {
    const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
    expect(persisted?.progress.kind).toBe("grid");
    if (!persisted || persisted.progress.kind !== "grid") return;

    expect(restorePuzzleSessionFromPersisted({
      ...persisted,
      progress: {
        ...persisted.progress,
        selectedCell: { row: 9, column: 0 },
      },
    })).toBeNull();
  });

  it("rejects progress that attempts to replace an immutable given", () => {
    const persisted = buildPersistedPuzzleSession("sudoku", makeSudokuSession());
    expect(persisted?.progress.kind).toBe("grid");
    if (!persisted || persisted.progress.kind !== "grid") return;

    expect(restorePuzzleSessionFromPersisted({
      ...persisted,
      progress: {
        ...persisted.progress,
        cells: persisted.progress.cells.map((cell, index) => index === 0 ? { ...cell, value: "9" } : cell),
      },
    })).toBeNull();
  });
});
