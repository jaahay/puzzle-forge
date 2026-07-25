import { describe, expect, it } from "vitest";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import {
  formatSudokuMetaCount,
  getStandardSudokuMetadata,
  getSudokuMetaKind,
  getZeroKillerSudokuMetadata,
} from "./SudokuMeta.logic";

const cells = [
  { row: 0, column: 0, value: "4", locked: true, tone: "given" },
  { row: 0, column: 1, value: "7", locked: false, tone: "answer" },
  { row: 0, column: 2, value: "", locked: false, tone: "empty" },
] satisfies PuzzleCell[];

describe("Sudoku metadata", () => {
  it("routes only Zero Killer to cage-oriented metadata", () => {
    expect(getSudokuMetaKind({ sudokuVariation: "zero-killer" })).toBe("zero-killer");
    expect(getSudokuMetaKind({ sudokuVariation: "classic" })).toBe("standard");
    expect(getSudokuMetaKind({ sudokuVariation: "diagonal" })).toBe("standard");
  });

  it("formats singular and plural metadata labels", () => {
    expect(formatSudokuMetaCount(1, "cage")).toBe("1 cage");
    expect(formatSudokuMetaCount(2, "cage")).toBe("2 cages");
    expect(formatSudokuMetaCount(1, "uncaged cell")).toBe("1 uncaged cell");
    expect(formatSudokuMetaCount(2, "uncaged cell")).toBe("2 uncaged cells");
  });

  it("retains standard Sudoku given and open-cell progress counts", () => {
    expect(getStandardSudokuMetadata(cells)).toEqual({
      givens: 1,
      filledOpenCells: 1,
      openCells: 2,
    });
  });

  it("reports cage-oriented Zero Killer metadata against the 81-cell board", () => {
    const puzzle = {
      width: 9,
      height: 9,
      cages: [
        {
          id: "zk-1",
          sum: 11,
          cells: [
            { row: 0, column: 0 },
            { row: 0, column: 1 },
          ],
        },
        {
          id: "zk-2",
          sum: 8,
          cells: [{ row: 1, column: 0 }],
        },
      ],
    } as GridGeneratedPuzzle;

    expect(getZeroKillerSudokuMetadata(puzzle, cells)).toEqual({
      cageCount: 2,
      uncagedCellCount: 78,
      filledCells: 2,
      totalCells: 81,
    });
  });
});
