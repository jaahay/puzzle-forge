import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";

type SudokuMetaProps = {
  puzzle: GridGeneratedPuzzle;
  cells: PuzzleCell[];
};

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
  const totalCells = puzzle.width * puzzle.height;

  return {
    cageCount: puzzle.cages?.length ?? 0,
    uncagedCellCount: Math.max(0, totalCells - cagedCells.size),
    filledCells: cells.filter((cell) => cell.value).length,
    totalCells,
  };
};

const StandardSudokuMeta = ({ puzzle, cells }: SudokuMetaProps) => {
  const metadata = getStandardSudokuMetadata(cells);

  return (
    <>
      {puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}
      <span>{metadata.givens} givens</span>
      <span>Progress: {metadata.filledOpenCells} of {metadata.openCells}</span>
    </>
  );
};

const ZeroKillerMeta = ({ puzzle, cells }: SudokuMetaProps) => {
  const metadata = getZeroKillerSudokuMetadata(puzzle, cells);

  return (
    <>
      {puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}
      <span>{metadata.cageCount} cages</span>
      <span>{metadata.uncagedCellCount} uncaged</span>
      <span>Progress: {metadata.filledCells} of {metadata.totalCells}</span>
    </>
  );
};

export const SudokuMeta = ({ puzzle, cells }: SudokuMetaProps) =>
  puzzle.sudokuVariation === "zero-killer" ? (
    <ZeroKillerMeta puzzle={puzzle} cells={cells} />
  ) : (
    <StandardSudokuMeta puzzle={puzzle} cells={cells} />
  );
