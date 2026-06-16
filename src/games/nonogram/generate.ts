import type { PuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";

export const generateNonogram: PuzzleGenerator = ({ seed, width, height }) => {
  const normalizedSeed = normalizeSeed(seed);
  const boundedWidth = normalizeDimension(width, 8, 5, 12);
  const boundedHeight = normalizeDimension(height, 8, 5, 12);
  const random = createRandom(`nonogram:${normalizedSeed}:${boundedWidth}x${boundedHeight}`);

  const cells = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => {
    const row = Math.floor(index / boundedWidth);
    const column = index % boundedWidth;
    const value = random() > 0.48 ? "■" : "";
    const locked = value !== "";

    return {
      row,
      column,
      value,
      locked,
      tone: locked ? "accent" : "empty",
      ariaLabel: locked ? `Filled nonogram cell at row ${row + 1}, column ${column + 1}` : `Empty nonogram cell at row ${row + 1}, column ${column + 1}`,
    } as const;
  });

  return createGeneratedPuzzle({
    id: `nonogram-${normalizedSeed}`,
    puzzleId: "nonogram",
    title: "Nonogram",
    seed: normalizedSeed,
    width: boundedWidth,
    height: boundedHeight,
    cells,
    notes: [
      "Prototype currently renders the generated answer grid.",
      "Next step: derive row and column clue runs from the same cell data.",
    ],
  });
};
