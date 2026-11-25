import type { PuzzleGenerator, PuzzleId } from "../catalog/types";
import { generateFutoshiki } from "./futoshiki/generate";
import { generateJigsaw } from "./jigsaw/generate";
import { generateLogicGrid } from "./logicGrid/generate";
import { generateNonogram } from "./nonogram/generate";
import { generatePegSolitaire } from "./pegSolitaire/generate";
import { generateSlidingPuzzle } from "./slidingPuzzle/generate";
import { generateSolitaire } from "./solitaire/generate";
import { generateSudoku } from "./sudoku/generate";
import { generateTileSwap } from "./tileSwap/generate";
import { generateWordGuess } from "./wordGuess/generate";
import { generateWordSearch } from "./wordSearch/generate";
import { defaultWordSearchTheme } from "./wordSearch/themes";

const generators: Partial<Record<PuzzleId, PuzzleGenerator>> = {
  sudoku: generateSudoku,
  nonogram: generateNonogram,
  "logic-grid": generateLogicGrid,
  jigsaw: generateJigsaw,
  "tile-swap": generateTileSwap,
  "sliding-puzzle": generateSlidingPuzzle,
  "klondike-solitaire": generateSolitaire,
  "peg-solitaire": generatePegSolitaire,
  futoshiki: generateFutoshiki,
};

export const hasPuzzleGenerator = (puzzleId: PuzzleId) => puzzleId === "word-guess" || puzzleId === "word-search" || Boolean(generators[puzzleId]);

export const generatePuzzle = (request: Parameters<PuzzleGenerator>[0], wordGuessAnswers?: readonly string[], wordSearchGeneralWords?: readonly string[]) => {
  if (request.puzzleId === "word-guess") {
    if (!wordGuessAnswers) throw new Error("Word Guess generation requires an explicit answer pool.");
    return generateWordGuess(request, wordGuessAnswers);
  }
  if (request.puzzleId === "word-search") {
    const { seed, difficulty = "Medium", wordSearchTheme = defaultWordSearchTheme } = request;
    const board = generateWordSearch({ seed, difficulty, theme: wordSearchTheme, generalWords: wordSearchGeneralWords });
    return { ...board, kind: "word-search" as const, puzzleId: "word-search" as const, title: "Word Search",
      id: `word-search:${board.seed}:${board.difficulty}:${board.theme}`,
      width: board.size, height: board.size, createdAt: new Date().toISOString() };
  }
  const generator = generators[request.puzzleId];

  if (!generator) {
    throw new Error(`No generator is registered for ${request.puzzleId}.`);
  }

  return generator(request);
};
