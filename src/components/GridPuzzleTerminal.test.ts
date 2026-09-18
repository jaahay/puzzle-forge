import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { getGridWorkspaceTerminalState } from "./GridPuzzleWorkspace";

const cell = (row: number, column: number, value: string): PuzzleCell => ({
  row,
  column,
  value,
  locked: false,
  tone: value ? "accent" : "empty",
  ariaLabel: "test cell",
});

const makePuzzle = (overrides: Partial<GridGeneratedPuzzle>): GridGeneratedPuzzle => ({
  id: "workspace-terminal",
  puzzleId: "futoshiki",
  title: "Grid puzzle",
  seed: "workspace-seed",
  width: 2,
  height: 2,
  checksum: "workspace-checksum",
  createdAt: "2026-09-17T00:00:00.000Z",
  notes: [],
  kind: "grid",
  cells: [],
  ...overrides,
});

describe("grid workspace terminal state", () => {
  it("maps solved Futoshiki and Nonogram boards to shared solved semantics", () => {
    const futoshiki = makePuzzle({ answerKey: ["1", "2", "2", "1"] });
    expect(getGridWorkspaceTerminalState(futoshiki, [
      cell(0, 0, "1"), cell(0, 1, "2"), cell(1, 0, "2"), cell(1, 1, "1"),
    ])).toEqual({ kind: "solved" });

    const nonogram = makePuzzle({
      puzzleId: "nonogram",
      title: "Nonogram",
      answerKey: undefined,
      clues: { rows: [[1], [1]], columns: [[1], [1]] },
    });
    expect(getGridWorkspaceTerminalState(nonogram, [
      cell(0, 0, "■"), cell(0, 1, ""), cell(1, 0, ""), cell(1, 1, "■"),
    ])).toEqual({ kind: "solved" });
  });

  it("leaves active or separately-owned grid families playing", () => {
    const futoshiki = makePuzzle({ answerKey: ["1", "2", "2", "1"] });
    expect(getGridWorkspaceTerminalState(futoshiki, [
      cell(0, 0, "1"), cell(0, 1, "2"), cell(1, 0, "2"), cell(1, 1, ""),
    ])).toEqual({ kind: "playing" });

    const wordGuess = makePuzzle({ puzzleId: "word-guess", title: "Word Guess", answerKey: ["A", "B", "C", "D"] });
    expect(getGridWorkspaceTerminalState(wordGuess, [
      cell(0, 0, "A"), cell(0, 1, "B"), cell(1, 0, "C"), cell(1, 1, "D"),
    ])).toEqual({ kind: "playing" });
  });
});
