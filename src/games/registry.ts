import type { PuzzleGenerator, PuzzleId } from "../catalog/types";
import { generateLogicGrid } from "./logicGrid/generate";
import { generateNonogram } from "./nonogram/generate";
import { generateSudoku } from "./sudoku/generate";
import { generateWordle } from "./wordle/generate";

const generators = {
  sudoku: generateSudoku,
  nonogram: generateNonogram,
  wordle: generateWordle,
  "logic-grid": generateLogicGrid,
} satisfies Partial<Record<PuzzleId, PuzzleGenerator>>;

export const hasPuzzleGenerator = (puzzleId: PuzzleId) => puzzleId in generators;

export const generatePuzzle = (request: Parameters<PuzzleGenerator>[0]) => {
  const generator = generators[request.puzzleId];

  if (!generator) {
    throw new Error(`No generator is registered for ${request.puzzleId}.`);
  }

  return generator(request);
};
