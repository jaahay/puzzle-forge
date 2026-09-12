import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { gridHistoryLimit, type GridHistoryEntry } from "./gridHistory";
import { serializePuzzle } from "./puzzleSerialization";
import {
  buildPersistedPuzzleSession,
  loadPersistedPuzzleSessions,
  restorePuzzleSessionFromPersisted,
  savePersistedPuzzleSessions,
  type PuzzleSession,
} from "./session";

const sudokuStorageKey = "puzzle-forge.session.sudoku";

const makeEmptyZeroKillerCells = (): PuzzleCell[] =>
  Array.from({ length: 81 }, (_, index) => {
    const row = Math.floor(index / 9);
    const column = index % 9;
    return {
      row,
      column,
      value: "",
      locked: false,
      tone: "empty" as const,
      ariaLabel: `Empty Zero Killer Sudoku cell at row ${row + 1}, column ${column + 1}`,
    };
  });

const makeZeroKillerPuzzle = (): GridGeneratedPuzzle => ({
  id: "sudoku-zero-killer-refresh-seed-medium",
  puzzleId: "sudoku",
  title: "Zero Killer Sudoku",
  seed: "refresh-seed",
  width: 9,
  height: 9,
  checksum: "checksum",
  createdAt: "2026-09-10T00:00:00.000Z",
  difficulty: "Medium",
  uniqueSolution: true,
  sudokuVariation: "zero-killer",
  notes: [],
  kind: "grid",
  cells: makeEmptyZeroKillerCells(),
});

const makeHistoryEntry = (step: number): GridHistoryEntry => {
  const targetIndex = step % 81;
  const value = String((step % 9) + 1);
  const row = Math.floor(targetIndex / 9);
  const column = targetIndex % 9;
  return {
    cells: makeEmptyZeroKillerCells().map((cell, index) => index === targetIndex
      ? { ...cell, value, ariaLabel: `${value} cell at row ${row + 1}, column ${column + 1}` }
      : cell),
    selectedGridCell: { row, column },
  };
};

const expectHistoryEntry = (entry: GridHistoryEntry | undefined, step: number) => {
  expect(entry).toBeDefined();
  if (!entry) return;
  const targetIndex = step % 81;
  const value = String((step % 9) + 1);
  const row = Math.floor(targetIndex / 9);
  const column = targetIndex % 9;
  expect(entry.cells[targetIndex]?.value).toBe(value);
  expect(entry.selectedGridCell).toEqual({ row, column });
};

const makeZeroKillerSession = (): PuzzleSession => {
  const puzzle = makeZeroKillerPuzzle();
  const emptyCells = makeEmptyZeroKillerCells();
  const cells = emptyCells.map((cell) => {
    if (cell.row === 2 && cell.column === 1) {
      return { ...cell, value: "2", ariaLabel: "2 cell at row 3, column 2" };
    }
    if (cell.row === 2 && cell.column === 4) {
      return { ...cell, value: "3", ariaLabel: "3 cell at row 3, column 5" };
    }
    return cell;
  });

  return {
    kind: "grid",
    puzzle,
    progress: {
      kind: "grid",
      cells,
      selectedCell: { row: 2, column: 4 },
      undoStack: [makeHistoryEntry(0)],
      redoStack: [],
    },
    statusMessage: "Sudoku entry updated.",
  };
};

const withMemoryStorage = (run: (storage: Map<string, string>) => void) => {
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

describe("active puzzle persistence resilience", () => {
  it("round-trips Zero Killer player progress with the exact materialized puzzle", () => {
    const session = makeZeroKillerSession();
    const persisted = buildPersistedPuzzleSession("sudoku", session);

    expect(persisted).not.toBeNull();
    if (!persisted) return;
    expect(persisted.puzzle).toBe(serializePuzzle(session.puzzle));

    const restored = restorePuzzleSessionFromPersisted(persisted);
    expect(restored?.progress.kind).toBe("grid");
    if (!restored || restored.progress.kind !== "grid") return;
    expect(serializePuzzle(restored.puzzle)).toBe(serializePuzzle(session.puzzle));
    expect(restored.progress.cells.find((cell) => cell.row === 2 && cell.column === 1)?.value).toBe("2");
    expect(restored.progress.cells.find((cell) => cell.row === 2 && cell.column === 4)?.value).toBe("3");
  });

  it("persists and restores the full grid history limit using compact durable snapshots", () => {
    withMemoryStorage((storage) => {
      const session = makeZeroKillerSession();
      if (session.progress.kind !== "grid") return;
      const undoStack = Array.from({ length: gridHistoryLimit }, (_, index) => makeHistoryEntry(index));
      const redoStack = Array.from({ length: gridHistoryLimit }, (_, index) => makeHistoryEntry(index + gridHistoryLimit));
      session.progress.undoStack = undoStack;
      session.progress.redoStack = redoStack;

      savePersistedPuzzleSessions({ activePuzzleId: "sudoku", sessions: { sudoku: session } });

      expect(session.progress.undoStack).toHaveLength(gridHistoryLimit);
      expect(session.progress.redoStack).toHaveLength(gridHistoryLimit);

      const raw = storage.get(sudokuStorageKey);
      expect(raw).toBeDefined();
      if (!raw) return;
      const durable = JSON.parse(raw) as {
        puzzle?: string;
        progress: {
          kind: "grid";
          history?: { undo: unknown[]; redo: unknown[] };
          undoStack?: unknown;
          redoStack?: unknown;
        };
      };
      expect(typeof durable.puzzle).toBe("string");
      expect(durable.progress.history?.undo).toHaveLength(gridHistoryLimit);
      expect(durable.progress.history?.redo).toHaveLength(gridHistoryLimit);
      expect(durable.progress.undoStack).toBeUndefined();
      expect(durable.progress.redoStack).toBeUndefined();

      const compactHistoryJson = JSON.stringify(durable.progress.history);
      const richHistoryJson = JSON.stringify({ undoStack, redoStack });
      expect(compactHistoryJson).not.toContain("ariaLabel");
      expect(compactHistoryJson).not.toContain('"row"');
      expect(compactHistoryJson.length).toBeLessThan(richHistoryJson.length / 5);

      const persisted = loadPersistedPuzzleSessions()?.sessions.sudoku;
      expect(persisted?.progress.kind).toBe("grid");
      if (!persisted || persisted.progress.kind !== "grid") return;
      const restored = restorePuzzleSessionFromPersisted(persisted);
      expect(restored?.progress.kind).toBe("grid");
      if (!restored || restored.progress.kind !== "grid") return;
      expect(restored.progress.undoStack).toHaveLength(gridHistoryLimit);
      expect(restored.progress.redoStack).toHaveLength(gridHistoryLimit);
      expectHistoryEntry(restored.progress.undoStack?.[0], 0);
      expectHistoryEntry(restored.progress.undoStack?.[gridHistoryLimit - 1], gridHistoryLimit - 1);
      expectHistoryEntry(restored.progress.redoStack?.[0], gridHistoryLimit);
      expectHistoryEntry(restored.progress.redoStack?.[gridHistoryLimit - 1], (gridHistoryLimit * 2) - 1);
    });
  });
});
