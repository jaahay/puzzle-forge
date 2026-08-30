import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import type { PuzzleSession } from "./session";
import { restoredSessionPreservesGeneratedState } from "./sessionIntegrity";

const puzzle: GridGeneratedPuzzle = {
  id: "sudoku-integrity",
  puzzleId: "sudoku",
  title: "Sudoku",
  seed: "integrity-seed",
  width: 9,
  height: 9,
  checksum: "checksum",
  createdAt: "2026-08-30T00:00:00.000Z",
  difficulty: "Medium",
  uniqueSolution: true,
  sudokuVariation: "classic",
  notes: [],
  kind: "grid",
  cells: [
    { row: 0, column: 0, value: "7", locked: true, tone: "given" },
    { row: 0, column: 1, value: "4", locked: false, tone: "answer" },
  ],
};

const session = (cells: PuzzleCell[]): PuzzleSession => ({
  kind: "grid",
  puzzle,
  progress: { kind: "grid", cells, selectedCell: null },
  statusMessage: "In progress.",
});

describe("restored session generated-state integrity", () => {
  it("allows player changes in editable cells", () => {
    expect(restoredSessionPreservesGeneratedState(session([
      { row: 0, column: 0, value: "7", locked: true, tone: "given" },
      { row: 0, column: 1, value: "9", locked: false, tone: "empty" },
    ]))).toBe(true);
  });

  it("rejects a changed generated given", () => {
    expect(restoredSessionPreservesGeneratedState(session([
      { row: 0, column: 0, value: "8", locked: true, tone: "given" },
      { row: 0, column: 1, value: "", locked: false, tone: "empty" },
    ]))).toBe(false);
  });

  it("rejects changing which generated cells are locked", () => {
    expect(restoredSessionPreservesGeneratedState(session([
      { row: 0, column: 0, value: "7", locked: false, tone: "given" },
      { row: 0, column: 1, value: "", locked: false, tone: "empty" },
    ]))).toBe(false);
  });
});
