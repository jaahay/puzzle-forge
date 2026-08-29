import { describe, expect, it } from "vitest";
import { getSudokuVariantRuleCopy } from "./StandardPuzzleWorkspace";

describe("Sudoku variant rule copy", () => {
  it("keeps Classic Sudoku free of special-rule chrome", () => {
    expect(getSudokuVariantRuleCopy("classic")).toBeNull();
  });

  it("describes Diagonal Sudoku concisely", () => {
    expect(getSudokuVariantRuleCopy("diagonal")).toBe(
      "Normal Sudoku rules apply, and both main diagonals must also contain 1–9.",
    );
  });

  it("describes Zero Killer cages without implying every cell is caged", () => {
    expect(getSudokuVariantRuleCopy("zero-killer")).toBe(
      "Normal Sudoku rules apply to every cell. Digits within each cage add to its displayed sum and may not repeat within that cage. Uncaged cells have no additional cage constraint.",
    );
  });
});
