import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { getGridCellAriaLabel, makeKillerCageDecorations } from "./GridPuzzlePreview";

const puzzleWithCage = {
  cages: [
    {
      id: "zk-4",
      sum: 10,
      cells: [
        { row: 1, column: 1 },
        { row: 0, column: 1 },
        { row: 0, column: 0 },
      ],
    },
  ],
} as GridGeneratedPuzzle;

describe("GridPuzzlePreview Zero Killer cage accessibility", () => {
  it("tracks stable cage membership, position, and borders", () => {
    const decorations = makeKillerCageDecorations(puzzleWithCage);

    expect(decorations.get("0-0")).toMatchObject({
      cageNumber: 1,
      sum: 10,
      cellPosition: 1,
      cellCount: 3,
      isClueCell: true,
      top: true,
      right: false,
      bottom: true,
      left: true,
    });
    expect(decorations.get("0-1")).toMatchObject({
      cellPosition: 2,
      isClueCell: false,
      top: true,
      right: true,
      bottom: false,
      left: false,
    });
    expect(decorations.get("1-1")).toMatchObject({
      cellPosition: 3,
      top: false,
      right: true,
      bottom: true,
      left: true,
    });
  });

  it("includes cage identity, sum, and membership position in the cell label", () => {
    const cell = {
      row: 0,
      column: 1,
      value: "",
      locked: false,
      tone: "empty",
      ariaLabel: "Empty Zero Killer Sudoku cell at row 1, column 2",
    } satisfies PuzzleCell;
    const decoration = makeKillerCageDecorations(puzzleWithCage).get("0-1");

    expect(getGridCellAriaLabel(cell, decoration)).toBe(
      "Empty Zero Killer Sudoku cell at row 1, column 2. Killer cage 1, sum 10, cell 2 of 3.",
    );
  });
});
