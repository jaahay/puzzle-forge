import type { SudokuVariation } from "../../catalog/types";

export const sudokuVariations: readonly SudokuVariation[] = ["classic", "diagonal"];

export const defaultSudokuVariation: SudokuVariation = "classic";

export const sudokuVariationLabels: Record<SudokuVariation, string> = {
  classic: "Classic",
  diagonal: "Diagonal",
};

export const sudokuVariationDescriptions: Record<SudokuVariation, string> = {
  classic: "Rows, columns, and 3x3 boxes contain 1-9.",
  diagonal: "Rows, columns, 3x3 boxes, and both main diagonals contain 1-9.",
};

export const normalizeSudokuVariation = (variation?: string | null): SudokuVariation =>
  variation === "diagonal" ? "diagonal" : defaultSudokuVariation;
