import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { assessGridAnswer, checkGridAnswer, isGridAnswerCompleteAndCorrect } from "./gridChecking";

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

const makeFutoshikiPuzzle = (): GridGeneratedPuzzle => ({
  ...makeSudokuPuzzle(),
  id: "test-futoshiki",
  puzzleId: "futoshiki",
  title: "Futoshiki",
});

const makeNonogramPuzzle = (rowClue: number[] = [2]): GridGeneratedPuzzle => ({
  ...makeSudokuPuzzle(),
  id: "test-nonogram",
  puzzleId: "nonogram",
  title: "Nonogram",
  width: 3,
  height: 1,
  cells: [],
  answerKey: ["■", "■", ""],
  clues: {
    rows: [rowClue],
    columns: [[1], [1], []],
  },
});

const makeCell = (row: number, column: number, value: string, locked = false): PuzzleCell => ({
  row,
  column,
  value,
  locked,
  tone: locked ? "given" : "empty",
  ariaLabel: `${value || "Empty"} cell at row ${row + 1}, column ${column + 1}`,
});

const solvedCells = () => [
  makeCell(0, 0, "1"),
  makeCell(0, 1, "2"),
  makeCell(1, 0, "3"),
  makeCell(1, 1, "4", true),
];

describe("shared answer-grid assessment", () => {
  it("distinguishes a solved board from incomplete and full-but-wrong boards", () => {
    const puzzle = makeSudokuPuzzle();
    const solved = assessGridAnswer(puzzle, solvedCells());
    const incomplete = assessGridAnswer(puzzle, [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "2"),
      makeCell(1, 0, ""),
      makeCell(1, 1, "4", true),
    ]);
    const fullButWrong = assessGridAnswer(puzzle, [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "9"),
      makeCell(1, 0, "3"),
      makeCell(1, 1, "4", true),
    ]);

    expect(solved).toMatchObject({
      hasAnswerKey: true,
      filled: true,
      solved: true,
      emptyCount: 0,
      incorrectCount: 0,
    });
    expect(solved.emptyCellIndices).toEqual([]);
    expect(solved.incorrectCellIndices).toEqual([]);

    expect(incomplete).toMatchObject({
      hasAnswerKey: true,
      filled: false,
      solved: false,
      emptyCount: 1,
      incorrectCount: 0,
    });
    expect(incomplete.emptyCellIndices).toEqual([2]);

    expect(fullButWrong).toMatchObject({
      hasAnswerKey: true,
      filled: true,
      solved: false,
      emptyCount: 0,
      incorrectCount: 1,
    });
    expect(fullButWrong.incorrectCellIndices).toEqual([1]);
  });

  it("reports unavailable answer truth without manufacturing diagnostics", () => {
    const assessment = assessGridAnswer({ ...makeSudokuPuzzle(), answerKey: undefined }, solvedCells());

    expect(assessment).toEqual({
      hasAnswerKey: false,
      filled: false,
      solved: false,
      emptyCount: 0,
      incorrectCount: 0,
      emptyCellIndices: [],
      incorrectCellIndices: [],
    });
  });
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
    expect(result.feedbackTone).toBe("error");
    expect(result.message).toBe("1 entry needs attention; 1 square empty.");
  });

  it("leaves correct entries neutral when the puzzle is valid but incomplete", () => {
    const result = checkGridAnswer(makeSudokuPuzzle(), [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "2"),
      makeCell(1, 0, ""),
      makeCell(1, 1, "4"),
    ]);

    expect(result.cells.map((cell) => cell.tone)).toEqual(["empty", "empty", "empty", "empty"]);
    expect(result.feedbackTone).toBe("progress");
    expect(result.message).toBe("Looks good so far. 1 square remaining.");
  });

  it("keeps solved cell tones calm and delegates celebration to the board presentation", () => {
    const result = checkGridAnswer(makeSudokuPuzzle(), solvedCells());

    expect(result.cells.map((cell) => cell.tone)).toEqual(["empty", "empty", "empty", "given"]);
    expect(result.feedbackTone).toBe("success");
    expect(result.message).toBe("Solved.");
  });
});

describe("shared answer-key checking", () => {
  it("reports valid incomplete Futoshiki input as progress", () => {
    const result = checkGridAnswer(makeFutoshikiPuzzle(), [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "2"),
      makeCell(1, 0, ""),
      makeCell(1, 1, "4", true),
    ]);

    expect(result.cells.map((cell) => cell.tone)).toEqual(["empty", "empty", "empty", "given"]);
    expect(result.feedbackTone).toBe("progress");
    expect(result.message).toBe("Looks good so far. 1 cell remaining.");
  });

  it("uses the same assessment semantics for a full but incorrect Futoshiki board", () => {
    const result = checkGridAnswer(makeFutoshikiPuzzle(), [
      makeCell(0, 0, "1"),
      makeCell(0, 1, "9"),
      makeCell(1, 0, "3"),
      makeCell(1, 1, "4", true),
    ]);

    expect(result.cells.map((cell) => cell.tone)).toEqual(["empty", "hint", "empty", "given"]);
    expect(result.feedbackTone).toBe("error");
    expect(result.message).toBe("1 entry needs attention.");
  });
});

describe("Nonogram grid checking feedback", () => {
  it("treats a feasible partial board as progress without decorating it as wrong", () => {
    const result = checkGridAnswer(makeNonogramPuzzle(), [
      makeCell(0, 0, "■"),
      makeCell(0, 1, ""),
      makeCell(0, 2, ""),
    ]);

    expect(result.cells.map((cell) => cell.tone)).toEqual(["accent", "empty", "empty"]);
    expect(result.feedbackTone).toBe("progress");
    expect(result.message).toBe("Looks good so far.");
  });

  it("marks only filled cells that participate in impossible clue lines", () => {
    const puzzle = makeNonogramPuzzle([1]);
    const result = checkGridAnswer(puzzle, [
      makeCell(0, 0, "■"),
      makeCell(0, 1, "■"),
      makeCell(0, 2, ""),
    ]);

    expect(result.cells.map((cell) => cell.tone)).toEqual(["hint", "hint", "empty"]);
    expect(result.feedbackTone).toBe("error");
    expect(result.message).toBe("1 row clue needs attention.");
  });
});

describe("automatic Sudoku completion detection", () => {
  it("recognizes only a fully filled correct answer", () => {
    const puzzle = makeSudokuPuzzle();

    expect(isGridAnswerCompleteAndCorrect(puzzle, solvedCells())).toBe(true);

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
