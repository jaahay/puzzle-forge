import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { sudokuVariationLabels } from "../games/sudoku/variation";
import {
  formatSudokuMetaCount,
  getStandardSudokuMetadata,
  getSudokuMetaKind,
  getZeroKillerSudokuMetadata,
} from "./SudokuMeta.logic";

type SudokuMetaProps = {
  puzzle: GridGeneratedPuzzle;
  cells: PuzzleCell[];
};

const StandardSudokuMeta = ({ puzzle, cells }: SudokuMetaProps) => {
  const metadata = getStandardSudokuMetadata(cells);
  const variation = puzzle.sudokuVariation ?? "classic";

  return (
    <>
      {puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}
      <span>{sudokuVariationLabels[variation]}</span>
      <span>{formatSudokuMetaCount(metadata.givens, "given")}</span>
      <span>Progress: {metadata.filledOpenCells} of {metadata.openCells}</span>
    </>
  );
};

const ZeroKillerMeta = ({ puzzle, cells }: SudokuMetaProps) => {
  const metadata = getZeroKillerSudokuMetadata(puzzle, cells);

  return (
    <>
      {puzzle.difficulty ? <span>{puzzle.difficulty}</span> : null}
      <span>{sudokuVariationLabels["zero-killer"]}</span>
      <span>{formatSudokuMetaCount(metadata.cageCount, "cage")}</span>
      <span>{formatSudokuMetaCount(metadata.uncagedCellCount, "uncaged cell")}</span>
      <span>Progress: {metadata.filledCells} of {metadata.totalCells}</span>
    </>
  );
};

export const SudokuMeta = ({ puzzle, cells }: SudokuMetaProps) =>
  getSudokuMetaKind(puzzle) === "zero-killer" ? (
    <ZeroKillerMeta puzzle={puzzle} cells={cells} />
  ) : (
    <StandardSudokuMeta puzzle={puzzle} cells={cells} />
  );
