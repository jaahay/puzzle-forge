import type { PuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";

const getClueDensity = (width: number, height: number) => {
  const area = width * height;

  if (area <= 25) {
    return 0.58;
  }

  if (area <= 64) {
    return 0.5;
  }

  return 0.43;
};

export const generateLogicGrid: PuzzleGenerator = ({ seed, width, height }) => {
  const normalizedSeed = normalizeSeed(seed);
  const boundedWidth = normalizeDimension(width, 6, 4, 12);
  const boundedHeight = normalizeDimension(height, 6, 4, 12);
  const random = createRandom(`logic-grid:${normalizedSeed}:${boundedWidth}x${boundedHeight}`);
  const clueDensity = getClueDensity(boundedWidth, boundedHeight);

  const cells = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => {
    const row = Math.floor(index / boundedWidth);
    const column = index % boundedWidth;
    const diagonalBias = row === column || row + column === boundedWidth - 1 ? 1 : 0;
    const solutionValue = String(1 + ((Math.floor(random() * 9) + diagonalBias) % 9));
    const locked = random() < clueDensity;

    return {
      row,
      column,
      value: locked ? solutionValue : "",
      locked,
      solutionValue,
      tone: locked ? "given" : "empty",
      ariaLabel: locked
        ? `Clue ${solutionValue} at row ${row + 1}, column ${column + 1}`
        : `Open logic-grid cell at row ${row + 1}, column ${column + 1}`,
    } as const;
  });

  if (!cells.some((cell) => cell.locked)) {
    cells[0] = { ...cells[0], locked: true, value: cells[0].solutionValue ?? "1", tone: "given" };
  }

  return createGeneratedPuzzle({
    id: `logic-grid-${normalizedSeed}`,
    puzzleId: "logic-grid",
    title: "Logic Grid",
    seed: normalizedSeed,
    width: boundedWidth,
    height: boundedHeight,
    cells,
    notes: [
      "Click open cells to cycle candidate digits; the board reports solved when every open cell matches the generated solution.",
      "Future versions can attach rules, regions, and solver traces to the same grid model.",
    ],
  });
};
