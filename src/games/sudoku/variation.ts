import type { SudokuVariation } from "../../catalog/types";

export const sudokuVariations: readonly SudokuVariation[] = ["classic", "diagonal", "zero-killer"];

export const defaultSudokuVariation: SudokuVariation = "classic";

export const sudokuVariationLabels: Record<SudokuVariation, string> = {
  classic: "Classic",
  diagonal: "Diagonal",
  "zero-killer": "Zero Killer",
};

export const sudokuVariationDescriptions: Record<SudokuVariation, string> = {
  classic: "Rows, columns, and 3x3 boxes contain 1-9.",
  diagonal: "Rows, columns, 3x3 boxes, and both main diagonals contain 1-9.",
  "zero-killer": "Rows, columns, and 3x3 boxes contain 1-9. Sparse killer cages show only the sums needed to keep the puzzle uniquely solvable.",
};

export const normalizeSudokuVariation = (variation?: string | null): SudokuVariation =>
  sudokuVariations.includes(variation as SudokuVariation) ? (variation as SudokuVariation) : defaultSudokuVariation;
