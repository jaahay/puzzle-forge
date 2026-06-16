import type { PuzzleGenerator, PuzzleId } from "../catalog/types";
import { generateLogicGrid } from "./logicGrid/generate";
import { generateNonogram } from "./nonogram/generate";
import { generatePegSolitaire } from "./pegSolitaire/generate";
import { generateSolitaire } from "./solitaire/generate";
import { generateSudoku } from "./sudoku/generate";
import { generateWordGuess } from "./wordle/generate";

const generators: Partial<Record<PuzzleId, PuzzleGenerator>> = {
  sudoku: generateSudoku,
  nonogram: generateNonogram,
  "word-guess": generateWordGuess,
  "logic-grid": generateLogicGrid,
  "klondike-solitaire": generateSolitaire,
  "peg-solitaire": generatePegSolitaire,
};

export const hasPuzzleGenerator = (puzzleId: PuzzleId) => Boolean(generators[puzzleId]);

export const generatePuzzle = (request: Parameters<PuzzleGenerator>[0]) => {
  const generator = generators[request.puzzleId];

  if (!generator) {
    throw new Error(`No generator is registered for ${request.puzzleId}.`);
  }

  return generator(request);
};
