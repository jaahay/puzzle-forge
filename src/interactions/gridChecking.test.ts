import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { checkGridAnswer, isGridAnswerCompleteAndCorrect } from "./gridChecking";

const makeSudokuPuzzle = (): GridGeneratedPuzzle => ({
  id: "test-sudoku",
  puzzleId: "sudoku",
  title: "Sudoku",
  seed: "test-seed",
  width: 2,
  height: 2,
  checksum: "test-checksum",
  createdAt: "2026-08-18T00:00:00.000Z",
  notes: [],
  kind: "grid",
  cells: [],
  answerKey: ["1", "2", "3", "4"],
});

const makeCell = (row: number, column: number, value: string, locked = false): PuzzleCell => ({
  row,
  column,
  value,
  locked,
  tone: locked ? "given" : "empty",
  ariaLabel: `${value || "Empty"} cell at row ${row + 1}, column ${column + 1}`,
});

describe("Sudoku grid checking feedback", () => {
  it("marks only incorrect entered cells when mistakes exist", () => {
    const result = checkGridAnswer(makeSudokuPuzzle(), [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "9"),
      makeCell(1, 0, ""),
      makeCell(1, 1, "4", true),
    ]);

    expect(result.cells.map((cell) => cell.tone)).toEqual(["empty", "hint", "empty", "given"]);
    expect(result.message).toContain("need attention");
  });

  it("leaves correct entries neutral when the puzzle is valid but incomplete", () => {
    const result = checkGridAnswer(makeSudokuPuzzle(), [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "2"),
      makeCell(1, 0, ""),
      makeCell(1, 1, "4"),
    ]);

    expect(result.cells.map((cell) => cell.tone)).toEqual(["empty", "empty", "empty", "empty"]);
    expect(result.message).toBe("No mistakes found. 1 square empty.");
  });

  it("uses a temporary success tone only when the puzzle is solved", () => {
    const result = checkGridAnswer(makeSudokuPuzzle(), [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "2"),
      makeCell(1, 0, "3"),
      makeCell(1, 1, "4", true),
    ]);

    expect(result.cells.map((cell) => cell.tone)).toEqual(["answer", "answer", "answer", "given"]);
    expect(result.message).toBe("Solved.");
  });
});

describe("automatic Sudoku completion detection", () => {
  it("recognizes only a fully filled correct answer", () => {
    const puzzle = makeSudokuPuzzle();

    expect(isGridAnswerCompleteAndCorrect(puzzle, [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "2"),
      makeCell(1, 0, "3"),
      makeCell(1, 1, "4", true),
    ])).toBe(true);

    expect(isGridAnswerCompleteAndCorrect(puzzle, [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "2"),
      makeCell(1, 0, ""),
      makeCell(1, 1, "4", true),
    ])).toBe(false);

    expect(isGridAnswerCompleteAndCorrect(puzzle, [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "9"),
      makeCell(1, 0, "3"),
      makeCell(1, 1, "4", true),
    ])).toBe(false);
  });
});
