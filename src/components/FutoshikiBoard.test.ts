import { describe, expect, it } from "vitest";
import type { GridPuzzleInequality, PuzzleCell } from "../catalog/types";
import { getFutoshikiCellAriaLabel, getFutoshikiInequalityPresentation } from "./FutoshikiBoard";

const makeCell = (row: number, column: number): PuzzleCell => ({
  row,
  column,
  value: "",
  locked: false,
  tone: "empty",
  ariaLabel: `Empty cell at row ${row + 1}, column ${column + 1}`,
});

describe("Futoshiki board presentation", () => {
  it("points the inequality chevron toward the lesser cell in every direction", () => {
    const cases: Array<{ inequality: GridPuzzleInequality; rotation: "left" | "right" | "up" | "down" }> = [
      { inequality: { lesser: { row: 0, column: 0 }, greater: { row: 0, column: 1 } }, rotation: "left" },
      { inequality: { lesser: { row: 0, column: 1 }, greater: { row: 0, column: 0 } }, rotation: "right" },
      { inequality: { lesser: { row: 0, column: 0 }, greater: { row: 1, column: 0 } }, rotation: "up" },
      { inequality: { lesser: { row: 1, column: 0 }, greater: { row: 0, column: 0 } }, rotation: "down" },
    ];

    for (const { inequality, rotation } of cases) {
      expect(getFutoshikiInequalityPresentation(inequality).rotation).toBe(rotation);
    }
  });

  it("describes adjacent inequalities on each affected cell", () => {
    const inequalities: GridPuzzleInequality[] = [
      { lesser: { row: 1, column: 1 }, greater: { row: 1, column: 2 } },
      { lesser: { row: 0, column: 1 }, greater: { row: 1, column: 1 } },
    ];

    expect(getFutoshikiCellAriaLabel(makeCell(1, 1), inequalities)).toContain("Less than the cell to the right");
    expect(getFutoshikiCellAriaLabel(makeCell(1, 1), inequalities)).toContain("Greater than the cell above");
    expect(getFutoshikiCellAriaLabel(makeCell(1, 2), inequalities)).toContain("Greater than the cell to the left");
  });
});
