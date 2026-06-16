import type { PuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeSeed } from "../shared";

const WORDS = ["FORGE", "LOGIC", "GRIDS", "CLUES", "SOLVE", "BRAIN", "LEVEL", "CHAIN"];
const ROWS = 6;
const COLUMNS = 5;

const rotateWord = (word: string, offset: number) => `${word.slice(offset)}${word.slice(0, offset)}`;

export const generateWordle: PuzzleGenerator = ({ seed }) => {
  const normalizedSeed = normalizeSeed(seed);
  const random = createRandom(`wordle:${normalizedSeed}`);
  const answerWord = WORDS[Math.floor(random() * WORDS.length)] ?? WORDS[0];

  const guesses = Array.from({ length: ROWS }, (_, row) => {
    if (row === ROWS - 1) {
      return "";
    }

    const base = WORDS[(row + Math.floor(random() * WORDS.length)) % WORDS.length] ?? answerWord;
    return rotateWord(base, Math.floor(random() * COLUMNS));
  });

  const cells = guesses.flatMap((guess, row) =>
    Array.from({ length: COLUMNS }, (_, column) => {
      const value = guess[column] ?? "";
      const exact = Boolean(value) && value === answerWord[column];
      const present = Boolean(value) && !exact && answerWord.includes(value);
      const tone = exact ? "answer" : present ? "hint" : "empty";
      const locked = row < ROWS - 1;

      return {
        row,
        column,
        value,
        locked,
        tone,
        ariaLabel: `${value || "Blank"} at row ${row + 1}, column ${column + 1}`,
      } as const;
    }),
  );

  return createGeneratedPuzzle({
    id: `wordle-${normalizedSeed}`,
    puzzleId: "wordle",
    title: "Wordle-like",
    seed: normalizedSeed,
    width: COLUMNS,
    height: ROWS,
    cells,
    notes: [
      "Click cells in the open row to cycle letters, then use Finished when you want to mark the attempt complete.",
      "Prototype uses a small built-in word list so the catalog can render without external data.",
    ],
  });
};
