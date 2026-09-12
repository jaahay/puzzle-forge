import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { getPuzzleProvenance, withPuzzleProvenance } from "./puzzleProvenance";
import { decodeGenerationId, encodeGenerationId, makePuzzleResourceKey } from "./puzzleResourceIdentity";
import {
  buildPersistedPuzzleSession,
  loadPersistedPuzzleSessions,
  restorePuzzleSessionFromPersisted,
  type PersistedPuzzleSession,
  type PuzzleSession,
} from "./session";

const metadataStorageKey = "puzzle-forge.sessions";

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

const makeSudokuResource = (puzzle: GridGeneratedPuzzle = makeSudokuPuzzle()) => ({
  puzzleId: "sudoku" as const,
  generationId: encodeGenerationId({
    puzzleId: "sudoku",
    seed: puzzle.seed,
    width: puzzle.width,
    height: puzzle.height,
    difficulty: puzzle.difficulty ?? "Medium",
    requireUniqueSolution: puzzle.uniqueSolution ?? true,
    sudokuVariation: puzzle.sudokuVariation ?? "classic",
    solitaireVariation: defaultSolitaireVariation,
    provenance: getPuzzleProvenance(puzzle),
  }),
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

const writeSession = (storage: Map<string, string>, session: PersistedPuzzleSession) => {
  const resourceKey = makePuzzleResourceKey(session.puzzleId, session.generationId);
  storage.set(metadataStorageKey, JSON.stringify({
    activeResourceKey: resourceKey,
    savedResourceKeys: [resourceKey],
    updatedAt: "2026-08-29T00:00:00.000Z",
  }));
  storage.set(`puzzle-forge.session.${resourceKey}`, JSON.stringify(session));
  return resourceKey;
};

describe("persisted session boundary validation", () => {
  it("accepts a valid compact grid session", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession(makeSudokuResource(), makeSudokuSession());
      expect(persisted).not.toBeNull();
      if (!persisted) return;
      const resourceKey = writeSession(storage, persisted);

      expect(loadPersistedPuzzleSessions()?.sessions[resourceKey]).toEqual(persisted);
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

    const persisted = buildPersistedPuzzleSession(makeSudokuResource(), session);
    expect(persisted?.progress.kind).toBe("grid");
    if (!persisted || persisted.progress.kind !== "grid") return;
    expect(persisted.progress.history?.undo[0]?.values).toHaveLength(80);
    expect(persisted.progress.history?.undo[0]?.values[0]).toBe("4");
    expect(persisted.progress.history?.undo[0]?.selectedCellIndex).toBe(1);
    expect(persisted.progress.history?.redo[0]?.values[0]).toBe("7");
    expect(persisted.progress.history?.redo[0]?.selectedCellIndex).toBeNull();

    const restored = restorePuzzleSessionFromPersisted(persisted, makeSudokuPuzzle());
    expect(restored?.progress.kind).toBe("grid");
    if (!restored || restored.progress.kind !== "grid") return;
    expect(restored.progress.undoStack?.[0].cells[1].value).toBe("4");
    expect(restored.progress.undoStack?.[0].selectedGridCell).toEqual({ row: 0, column: 1 });
    expect(restored.progress.redoStack?.[0].cells[1].value).toBe("7");
  });

  it("persists explicit daily provenance in the generation identity", () => {
    const session = makeSudokuSession();
    const dailyPuzzle = withPuzzleProvenance(session.puzzle, {
      source: "daily",
      dateStamp: "2026-08-29",
    }) as GridGeneratedPuzzle;
    session.puzzle = dailyPuzzle;

    const resource = makeSudokuResource(dailyPuzzle);
    const persisted = buildPersistedPuzzleSession(resource, session);
    expect(persisted).not.toBeNull();
    if (!persisted) return;

    const decoded = decodeGenerationId("sudoku", persisted.generationId);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.identity.provenance).toEqual({ source: "daily", dateStamp: "2026-08-29" });
    }

    const regenerated = withPuzzleProvenance(makeSudokuPuzzle(), {
      source: "daily",
      dateStamp: "2026-08-29",
    }) as GridGeneratedPuzzle;
    const restored = restorePuzzleSessionFromPersisted(persisted, regenerated);
    expect(restored).not.toBeNull();
    if (!restored) return;
    expect(getPuzzleProvenance(restored.puzzle)).toEqual({ source: "daily", dateStamp: "2026-08-29" });
    expect(restored.puzzle.seed).toBe("validation-seed");
  });

  it("rejects invalid generation identity and session metadata", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession(makeSudokuResource(), makeSudokuSession());
      expect(persisted).not.toBeNull();
      if (!persisted) return;

      writeSession(storage, { ...persisted, generationId: "not-a-generation-id" });
      expect(loadPersistedPuzzleSessions()).toBeNull();

      writeSession(storage, { ...persisted, puzzleId: "nonogram" });
      expect(loadPersistedPuzzleSessions()).toBeNull();

      writeSession(storage, { ...persisted, completedAt: 42 as unknown as string });
      expect(loadPersistedPuzzleSessions()).toBeNull();
    });
  });

  it("rejects malformed grid cells and selections", () => {
    withMockWindowStorage((storage) => {
      const persisted = buildPersistedPuzzleSession(makeSudokuResource(), makeSudokuSession());
      expect(persisted?.progress.kind).toBe("grid");
      if (!persisted || persisted.progress.kind !== "grid") return;

      writeSession(storage, {
        ...persisted,
        progress: {
          ...persisted.progress,
          cells: [{ ...persisted.progress.cells[0], tone: "corrupt" as PuzzleCell["tone"] }],
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
      const persisted = buildPersistedPuzzleSession(makeSudokuResource(), makeSudokuSession());
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

  it("rejects structurally valid progress of the wrong kind when applying it to a regenerated puzzle", () => {
    const persisted = buildPersistedPuzzleSession(makeSudokuResource(), makeSudokuSession());
    expect(persisted).not.toBeNull();
    if (!persisted) return;

    const wrongKind: PersistedPuzzleSession = {
      ...persisted,
      progress: {
        kind: "tiles",
        tileOrder: [],
        selectedTileId: null,
      },
    };

    expect(restorePuzzleSessionFromPersisted(wrongKind, makeSudokuPuzzle())).toBeNull();
  });

  it("rejects duplicate or incomplete grid coordinates when restoring progress", () => {
    const persisted = buildPersistedPuzzleSession(makeSudokuResource(), makeSudokuSession());
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

    expect(restorePuzzleSessionFromPersisted(duplicateCoordinates, makeSudokuPuzzle())).toBeNull();
    expect(restorePuzzleSessionFromPersisted(incompleteCoordinates, makeSudokuPuzzle())).toBeNull();
  });

  it("rejects a selected grid coordinate that does not exist on the regenerated board", () => {
    const persisted = buildPersistedPuzzleSession(makeSudokuResource(), makeSudokuSession());
    expect(persisted?.progress.kind).toBe("grid");
    if (!persisted || persisted.progress.kind !== "grid") return;

    expect(restorePuzzleSessionFromPersisted({
      ...persisted,
      progress: {
        ...persisted.progress,
        selectedCell: { row: 9, column: 0 },
      },
    }, makeSudokuPuzzle())).toBeNull();
  });

  it("rejects progress that attempts to replace an immutable given", () => {
    const persisted = buildPersistedPuzzleSession(makeSudokuResource(), makeSudokuSession());
    expect(persisted?.progress.kind).toBe("grid");
    if (!persisted || persisted.progress.kind !== "grid") return;

    expect(restorePuzzleSessionFromPersisted({
      ...persisted,
      progress: {
        ...persisted.progress,
        cells: persisted.progress.cells.map((cell, index) => index === 0 ? { ...cell, value: "9" } : cell),
      },
    }, makeSudokuPuzzle())).toBeNull();
  });
});
