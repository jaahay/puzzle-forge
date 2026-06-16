import type { PuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeSeed } from "../shared";

const WORDS = ["FORGE", "LOGIC", "GRIDS", "CLUES", "SOLVE", "BRAIN", "LEVEL", "CHAIN"];
const ROWS = 6;
const COLUMNS = 5;

export const generateWordGuess: PuzzleGenerator = ({ seed }) => {
  const normalizedSeed = normalizeSeed(seed);
  const random = createRandom(`word-guess:${normalizedSeed}`);
  const answerWord = WORDS[Math.floor(random() * WORDS.length)] ?? WORDS[0];

  const cells = Array.from({ length: ROWS * COLUMNS }, (_, index) => {
    const row = Math.floor(index / COLUMNS);
    const column = index % COLUMNS;

    return {
      row,
      column,
      value: "",
      locked: false,
      tone: "empty",
      ariaLabel: `Word Guess cell at row ${row + 1}, column ${column + 1}`,
    } as const;
  });

  return createGeneratedPuzzle({
    id: `word-guess-${normalizedSeed}`,
    puzzleId: "word-guess",
    title: "Word Guess",
    seed: normalizedSeed,
    width: COLUMNS,
    height: ROWS,
    cells,
    answerKey: Array.from(answerWord),
    notes: [
      "Type five-letter guesses into the grid, then use Check to judge exact and present letters.",
      "Prototype uses a small built-in word list so the catalog can render without external data.",
    ],
  });
};
