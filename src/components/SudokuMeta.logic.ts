import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";

export const SUDOKU_CELL_COUNT = 81;

export type SudokuMetaKind = "standard" | "zero-killer";

export type StandardSudokuMetadata = {
  givens: number;
  filledOpenCells: number;
  openCells: number;
};

export type ZeroKillerSudokuMetadata = {
  cageCount: number;
  uncagedCellCount: number;
  filledCells: number;
  totalCells: number;
};

export const getSudokuMetaKind = (
  puzzle: Pick<GridGeneratedPuzzle, "sudokuVariation">,
): SudokuMetaKind => puzzle.sudokuVariation === "zero-killer" ? "zero-killer" : "standard";

export const formatSudokuMetaCount = (
  count: number,
  singularLabel: string,
  pluralLabel = `${singularLabel}s`,
) => `${count} ${count === 1 ? singularLabel : pluralLabel}`;

export const getStandardSudokuMetadata = (cells: PuzzleCell[]): StandardSudokuMetadata => ({
  givens: cells.filter((cell) => cell.locked).length,
  filledOpenCells: cells.filter((cell) => !cell.locked && cell.value).length,
  openCells: cells.filter((cell) => !cell.locked).length,
});

export const getZeroKillerSudokuMetadata = (
  puzzle: GridGeneratedPuzzle,
  cells: PuzzleCell[],
): ZeroKillerSudokuMetadata => {
  const cagedCells = new Set(
    (puzzle.cages ?? []).flatMap((cage) => cage.cells.map((cell) => `${cell.row}-${cell.column}`)),
  );

  return {
    cageCount: puzzle.cages?.length ?? 0,
    uncagedCellCount: Math.max(0, SUDOKU_CELL_COUNT - cagedCells.size),
    filledCells: cells.filter((cell) => cell.value).length,
    totalCells: SUDOKU_CELL_COUNT,
  };
};
