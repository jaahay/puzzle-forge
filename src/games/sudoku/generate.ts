import type { PuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeSeed } from "../shared";

const BOARD_SIZE = 9;
const BOX_SIZE = 3;

export const generateSudoku: PuzzleGenerator = ({ seed }) => {
  const normalizedSeed = normalizeSeed(seed);
  const random = createRandom(`sudoku:${normalizedSeed}`);
  const digitOffset = Math.floor(random() * BOARD_SIZE);
  const clueDensity = 0.42 + random() * 0.16;

  const cells = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => {
    const row = Math.floor(index / BOARD_SIZE);
    const column = index % BOARD_SIZE;
    const pattern = (row * BOX_SIZE + Math.floor(row / BOX_SIZE) + column + digitOffset) % BOARD_SIZE;
    const solutionValue = String(pattern + 1);
    const locked = random() < clueDensity || (row === column && random() < 0.7);

    return {
      row,
      column,
      value: locked ? solutionValue : "",
      locked,
      solutionValue,
      tone: locked ? "given" : "empty",
      ariaLabel: locked
        ? `Given ${solutionValue} at row ${row + 1}, column ${column + 1}`
        : `Empty Sudoku cell at row ${row + 1}, column ${column + 1}`,
    } as const;
  });

  return createGeneratedPuzzle({
    id: `sudoku-${normalizedSeed}`,
    puzzleId: "sudoku",
    title: "Sudoku",
    seed: normalizedSeed,
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    cells,
    notes: [
      "Click open cells to cycle digits; the board reports solved when every entry matches the generated solution.",
      "Generator uses a valid base grid pattern with seeded digit rotation; uniqueness and difficulty grading are future work.",
    ],
  });
};
