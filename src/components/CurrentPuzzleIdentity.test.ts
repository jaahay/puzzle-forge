import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle } from "../catalog/types";
import { getCurrentPuzzleIdentity, getPuzzleArrivalIdentity } from "./CurrentPuzzleIdentity";

const makeGridPuzzle = (overrides: Partial<GridGeneratedPuzzle> = {}): GridGeneratedPuzzle => ({
  id: "puzzle",
  puzzleId: "nonogram",
  title: "Nonogram",
  seed: "random-nonogram-seed",
  width: 8,
  height: 8,
  checksum: "checksum",
  createdAt: "2026-09-03T00:00:00.000Z",
  difficulty: "Medium",
  uniqueSolution: true,
  notes: [],
  kind: "grid",
  cells: [],
  ...overrides,
});

const currentDateStamp = "2026-09-03";

describe("current puzzle identity", () => {
  it("describes a regular Nonogram while omitting the default difficulty", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      width: 10,
      height: 6,
    }), currentDateStamp)).toEqual({
      sourceLabel: null,
      details: ["10×6", "One solution"],
    });
  });

  it("includes a non-default Nonogram difficulty independently", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({ difficulty: "Hard" }), currentDateStamp)).toEqual({
      sourceLabel: null,
      details: ["Hard", "8×8", "One solution"],
    });
  });

  it("identifies today's canonical Nonogram and preserves its enacted profile", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      seed: "daily-nonogram-2026-09-03",
      width: 8,
      height: 8,
      difficulty: "Medium",
      uniqueSolution: true,
    }), currentDateStamp)).toEqual({
      sourceLabel: "Today",
      details: ["8×8", "One solution"],
    });
  });

  it("keeps daily provenance without calling a prior daily puzzle Today", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      seed: "daily-nonogram-2026-09-02",
    }), currentDateStamp)).toEqual({
      sourceLabel: "Daily Sep 2",
      details: ["8×8", "One solution"],
    });
  });

  it("includes the year for a daily puzzle from a different year", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      seed: "daily-nonogram-2025-09-03",
    }), currentDateStamp)).toEqual({
      sourceLabel: "Daily Sep 3, 2025",
      details: ["8×8", "One solution"],
    });
  });

  it("distinguishes unchecked Nonogram uniqueness without claiming multiple solutions", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({ uniqueSolution: false }), currentDateStamp)).toEqual({
      sourceLabel: null,
      details: ["8×8", "Uniqueness not required"],
    });
  });

  it("omits both default Sudoku configuration values", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      puzzleId: "sudoku",
      title: "Sudoku",
      width: 9,
      height: 9,
      difficulty: "Medium",
      sudokuVariation: "classic",
    }), currentDateStamp)).toEqual({
      sourceLabel: null,
      details: [],
    });
  });

  it("includes a non-default Sudoku difficulty without requiring a variation", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      puzzleId: "sudoku",
      title: "Sudoku",
      width: 9,
      height: 9,
      difficulty: "Hard",
      sudokuVariation: "classic",
    }), currentDateStamp)).toEqual({
      sourceLabel: null,
      details: ["Hard"],
    });
  });

  it("includes a non-default Sudoku variation without requiring a difficulty", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      puzzleId: "sudoku",
      title: "Diagonal Sudoku",
      seed: "daily-sudoku-2026-09-03",
      width: 9,
      height: 9,
      difficulty: "Medium",
      sudokuVariation: "diagonal",
    }), currentDateStamp)).toEqual({
      sourceLabel: "Today",
      details: ["Diagonal"],
    });
  });

  it("includes non-default Sudoku difficulty and variation independently", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      puzzleId: "sudoku",
      title: "Diagonal Sudoku",
      width: 9,
      height: 9,
      difficulty: "Hard",
      sudokuVariation: "diagonal",
    }), currentDateStamp)).toEqual({
      sourceLabel: null,
      details: ["Hard", "Diagonal"],
    });
  });

  it("changes arrival identity only when identity-bearing generated metadata changes", () => {
    const puzzle = makeGridPuzzle();
    const samePuzzleWithProgressOnly = { ...puzzle, cells: [{ row: 0, column: 0, value: "x", locked: false, tone: "answer" as const }] };

    expect(getPuzzleArrivalIdentity(samePuzzleWithProgressOnly)).toBe(getPuzzleArrivalIdentity(puzzle));
    expect(getPuzzleArrivalIdentity({ ...puzzle, seed: "another-seed" })).not.toBe(getPuzzleArrivalIdentity(puzzle));
  });
});
