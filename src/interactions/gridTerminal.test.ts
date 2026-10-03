import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { isGridPuzzleSolved } from "./gridChecking";

const makeCell = (row: number, column: number, value: string): PuzzleCell => ({
  row,
  column,
  value,
  locked: false,
  tone: value ? "accent" : "empty",
  ariaLabel: "test cell",
});

const makePuzzle = (overrides: Partial<GridGeneratedPuzzle>): GridGeneratedPuzzle => ({
  id: "terminal-grid",
  puzzleId: "futoshiki",
  title: "Grid puzzle",
  seed: "terminal-seed",
  width: 2,
  height: 2,
  checksum: "terminal-checksum",
  createdAt: "2026-09-17T00:00:00.000Z",
  notes: [],
  kind: "grid",
  cells: [],
  ...overrides,
});

describe("grid terminal-state detection", () => {
  it("recognizes Futoshiki only when the authoritative answer is complete and correct", () => {
    const puzzle = makePuzzle({
      puzzleId: "futoshiki",
      title: "Futoshiki",
      answerKey: ["1", "2", "2", "1"],
    });

    expect(isGridPuzzleSolved(puzzle, [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "2"),
      makeCell(1, 0, "2"),
      makeCell(1, 1, "1"),
    ])).toBe(true);
    expect(isGridPuzzleSolved(puzzle, [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "2"),
      makeCell(1, 0, "2"),
      makeCell(1, 1, ""),
    ])).toBe(false);
    expect(isGridPuzzleSolved(puzzle, [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "2"),
      makeCell(1, 0, "1"),
      makeCell(1, 1, "2"),
    ])).toBe(false);
  });

  it("recognizes Nonogram completion from satisfied row and column clues", () => {
    const puzzle = makePuzzle({
      puzzleId: "nonogram",
      title: "Nonogram",
      clues: {
        rows: [[1], [1]],
        columns: [[1], [1]],
      },
      answerKey: undefined,
    });

    expect(isGridPuzzleSolved(puzzle, [
      makeCell(0, 0, "■"),
      makeCell(0, 1, ""),
      makeCell(1, 0, ""),
      makeCell(1, 1, "■"),
    ])).toBe(true);
    expect(isGridPuzzleSolved(puzzle, [
      makeCell(0, 0, "■"),
      makeCell(0, 1, ""),
      makeCell(1, 0, ""),
      makeCell(1, 1, ""),
    ])).toBe(false);
  });
});
