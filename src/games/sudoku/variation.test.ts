import { describe, expect, it } from "vitest";
import { sudokuVariationRules } from "./variation";

describe("Sudoku variation rules", () => {
  it("keeps Classic Sudoku free of special-rule chrome", () => {
    expect(sudokuVariationRules.classic).toBeUndefined();
  });

  it("describes Diagonal Sudoku concisely", () => {
    expect(sudokuVariationRules.diagonal).toBe(
      "Normal Sudoku rules apply, and both main diagonals must also contain 1–9.",
    );
  });

  it("describes Zero Killer cages without implying every cell is caged", () => {
    expect(sudokuVariationRules["zero-killer"]).toBe(
      "Normal Sudoku rules apply to every cell. Digits within each cage add to its displayed sum and may not repeat within that cage. Uncaged cells have no additional cage constraint.",
    );
  });
});
