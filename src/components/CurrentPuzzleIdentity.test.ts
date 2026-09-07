import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle, GridGeneratedPuzzle } from "../catalog/types";
import { withPuzzleProvenance } from "../app/puzzleProvenance";
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

const withDaily = (puzzle: GeneratedPuzzle, dateStamp: string) =>
  withPuzzleProvenance(puzzle, { source: "daily", dateStamp });

const currentDateStamp = "2026-09-03";

describe("current puzzle identity", () => {
  it("starts Nonogram chrome with puzzle type and ends textual identity with difficulty", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle(), currentDateStamp)).toEqual({
      puzzleLabel: "Nonogram",
      sourceLabel: null,
      details: [],
      difficultyLabel: "Medium",
    });
  });

  it("includes non-default Nonogram dimensions before difficulty", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({ width: 10, height: 6 }), currentDateStamp)).toEqual({
      puzzleLabel: "Nonogram",
      sourceLabel: null,
      details: ["10×6"],
      difficultyLabel: "Medium",
    });
  });

  it("distinguishes unchecked Nonogram uniqueness without claiming multiple solutions", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({ uniqueSolution: false }), currentDateStamp)).toEqual({
      puzzleLabel: "Nonogram",
      sourceLabel: null,
      details: ["Uniqueness not required"],
      difficultyLabel: "Medium",
    });
  });

  it("combines independent Nonogram traits while keeping difficulty last", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      width: 10,
      height: 6,
      difficulty: "Hard",
      uniqueSolution: false,
    }), currentDateStamp)).toEqual({
      puzzleLabel: "Nonogram",
      sourceLabel: null,
      details: ["10×6", "Uniqueness not required"],
      difficultyLabel: "Hard",
    });
  });

  it("identifies today's Nonogram from explicit provenance rather than its seed", () => {
    const puzzle = withDaily(makeGridPuzzle({
      seed: "opaque-daily-seed",
      difficulty: "Medium",
    }), "2026-09-03");

    expect(getCurrentPuzzleIdentity(puzzle, currentDateStamp)).toEqual({
      puzzleLabel: "Nonogram",
      sourceLabel: "Today",
      details: [],
      difficultyLabel: "Medium",
    });
  });

  it("keeps daily provenance without calling a prior daily puzzle Today", () => {
    expect(getCurrentPuzzleIdentity(
      withDaily(makeGridPuzzle(), "2026-09-02"),
      currentDateStamp,
    )).toEqual({
      puzzleLabel: "Nonogram",
      sourceLabel: "Daily Sep 2",
      details: [],
      difficultyLabel: "Medium",
    });
  });

  it("includes the year for a daily puzzle from a different year", () => {
    expect(getCurrentPuzzleIdentity(
      withDaily(makeGridPuzzle(), "2025-09-03"),
      currentDateStamp,
    )).toEqual({
      puzzleLabel: "Nonogram",
      sourceLabel: "Daily Sep 3, 2025",
      details: [],
      difficultyLabel: "Medium",
    });
  });

  it("does not infer Today from a seed that happens to use the old daily prefix", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      seed: "daily-nonogram-2026-09-03-medium-8x8-unique",
    }), currentDateStamp).sourceLabel).toBeNull();
  });

  it("starts Sudoku chrome with puzzle type and omits the default ruleset", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      puzzleId: "sudoku",
      title: "Sudoku",
      width: 9,
      height: 9,
      difficulty: "Medium",
      sudokuVariation: "classic",
    }), currentDateStamp)).toEqual({
      puzzleLabel: "Sudoku",
      sourceLabel: null,
      details: [],
      difficultyLabel: "Medium",
    });
  });

  it("includes a non-default Sudoku variation before difficulty", () => {
    expect(getCurrentPuzzleIdentity(makeGridPuzzle({
      puzzleId: "sudoku",
      title: "Diagonal Sudoku",
      width: 9,
      height: 9,
      difficulty: "Medium",
      sudokuVariation: "diagonal",
    }), currentDateStamp)).toEqual({
      puzzleLabel: "Sudoku",
      sourceLabel: null,
      details: ["Diagonal"],
      difficultyLabel: "Medium",
    });
  });

  it("combines Today, variation, and difficulty in the intended semantic order", () => {
    const puzzle = withDaily(makeGridPuzzle({
      puzzleId: "sudoku",
      title: "Diagonal Sudoku",
      seed: "another-opaque-seed",
      width: 9,
      height: 9,
      difficulty: "Hard",
      sudokuVariation: "diagonal",
    }), "2026-09-03");

    expect(getCurrentPuzzleIdentity(puzzle, currentDateStamp)).toEqual({
      puzzleLabel: "Sudoku",
      sourceLabel: "Today",
      details: ["Diagonal"],
      difficultyLabel: "Hard",
    });
  });

  it("changes arrival identity only when identity-bearing generated metadata changes", () => {
    const puzzle = makeGridPuzzle();
    const samePuzzleWithProgressOnly = { ...puzzle, cells: [{ row: 0, column: 0, value: "x", locked: false, tone: "answer" as const }] };

    expect(getPuzzleArrivalIdentity(samePuzzleWithProgressOnly)).toBe(getPuzzleArrivalIdentity(puzzle));
    expect(getPuzzleArrivalIdentity({ ...puzzle, seed: "another-seed" })).not.toBe(getPuzzleArrivalIdentity(puzzle));
    expect(getPuzzleArrivalIdentity(withDaily(puzzle, currentDateStamp))).not.toBe(getPuzzleArrivalIdentity(puzzle));
  });
});
