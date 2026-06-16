import type { PuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";

const summarizeRuns = (values: boolean[]) => {
  const runs: number[] = [];
  let currentRun = 0;

  for (const value of values) {
    if (value) {
      currentRun += 1;
    } else if (currentRun > 0) {
      runs.push(currentRun);
      currentRun = 0;
    }
  }

  if (currentRun > 0) {
    runs.push(currentRun);
  }

  return runs.length > 0 ? runs.join("-") : "0";
};

export const generateNonogram: PuzzleGenerator = ({ seed, width, height }) => {
  const normalizedSeed = normalizeSeed(seed);
  const boundedWidth = normalizeDimension(width, 8, 5, 12);
  const boundedHeight = normalizeDimension(height, 8, 5, 12);
  const random = createRandom(`nonogram:${normalizedSeed}:${boundedWidth}x${boundedHeight}`);
  const solution = Array.from({ length: boundedWidth * boundedHeight }, () => random() > 0.48);
  const rowClues = Array.from({ length: boundedHeight }, (_, row) =>
    summarizeRuns(solution.slice(row * boundedWidth, row * boundedWidth + boundedWidth)),
  );
  const columnClues = Array.from({ length: boundedWidth }, (_, column) =>
    summarizeRuns(Array.from({ length: boundedHeight }, (_, row) => solution[row * boundedWidth + column] ?? false)),
  );

  const cells = Array.from({ length: boundedWidth * boundedHeight }, (_, index) => {
    const row = Math.floor(index / boundedWidth);
    const column = index % boundedWidth;
    const solutionValue = solution[index] ? "■" : "";

    return {
      row,
      column,
      value: "",
      locked: false,
      solutionValue,
      tone: "empty",
      ariaLabel: `Playable nonogram cell at row ${row + 1}, column ${column + 1}`,
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
      `Row clues: ${rowClues.join(" / ")}`,
      `Column clues: ${columnClues.join(" / ")}`,
      "Click cells to toggle filled squares; the board reports solved when the grid matches the generated clues.",
    ],
  });
};
