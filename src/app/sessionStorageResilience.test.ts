import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import {
  serializeGeneratedPuzzleReference,
  serializePersistedPuzzleReference,
} from "./puzzleReference";
import {
  buildPersistedPuzzleSession,
  loadPersistedPuzzleSessions,
  restorePuzzleSessionFromPersisted,
  savePersistedPuzzleSessions,
  type PuzzleSession,
} from "./session";

const metadataStorageKey = "puzzle-forge.sessions.v1";
const sudokuStorageKey = "puzzle-forge.session.v1.sudoku";

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
  id: "sudoku-zero-killer-v1-refresh-seed-medium",
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
      undoStack: [{
        cells: emptyCells,
        selectedGridCell: { row: 2, column: 1 },
      }],
      redoStack: [],
    },
    statusMessage: "Sudoku entry updated.",
  };
};

const withQuotaLimitedStorage = (run: (storage: Map<string, string>, getQuotaRejections: () => number) => void) => {
  const storage = new Map<string, string>();
  let quotaRejections = 0;
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          if (key === sudokuStorageKey && value.includes('"undoStack":[{')) {
            quotaRejections += 1;
            const error = new Error("Storage quota exceeded");
            error.name = "QuotaExceededError";
            throw error;
          }
          storage.set(key, value);
        },
        removeItem: (key: string) => storage.delete(key),
      },
    },
  });

  try {
    run(storage, () => quotaRejections);
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
};

describe("active puzzle persistence resilience", () => {
  it("round-trips Zero Killer player progress for the same durable puzzle reference", () => {
    const session = makeZeroKillerSession();
    const persisted = buildPersistedPuzzleSession("sudoku", session);

    expect(persisted).not.toBeNull();
    if (!persisted) return;
    expect(serializePersistedPuzzleReference(persisted)).toBe(serializeGeneratedPuzzleReference(session.puzzle));

    const restored = restorePuzzleSessionFromPersisted(persisted, makeZeroKillerPuzzle());
    expect(restored?.progress.kind).toBe("grid");
    if (!restored || restored.progress.kind !== "grid") return;
    expect(restored.progress.cells.find((cell) => cell.row === 2 && cell.column === 1)?.value).toBe("2");
    expect(restored.progress.cells.find((cell) => cell.row === 2 && cell.column === 4)?.value).toBe("3");
  });

  it("keeps current grid progress saveable when durable history exceeds browser storage quota", () => {
    withQuotaLimitedStorage((storage, getQuotaRejections) => {
      const session = makeZeroKillerSession();

      savePersistedPuzzleSessions({ activePuzzleId: "sudoku", sessions: { sudoku: session } });

      expect(getQuotaRejections()).toBe(1);
      expect(storage.has(metadataStorageKey)).toBe(true);
      const restored = loadPersistedPuzzleSessions()?.sessions.sudoku;
      expect(restored?.progress.kind).toBe("grid");
      if (!restored || restored.progress.kind !== "grid") return;
      expect(restored.progress.cells.find((cell) => cell.row === 2 && cell.column === 1)?.value).toBe("2");
      expect(restored.progress.cells.find((cell) => cell.row === 2 && cell.column === 4)?.value).toBe("3");
      expect(restored.progress.undoStack).toEqual([]);
      expect(restored.progress.redoStack).toEqual([]);
    });
  });
});
