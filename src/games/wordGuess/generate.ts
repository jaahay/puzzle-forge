import type { PuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";
import {
  DEFAULT_WORD_GUESS_GUESSES,
  DEFAULT_WORD_GUESS_LENGTH,
  getWordGuessBank,
  WORD_GUESS_MAX_GUESSES,
  WORD_GUESS_MAX_LENGTH,
  WORD_GUESS_MIN_GUESSES,
  WORD_GUESS_MIN_LENGTH,
} from "./words";

export const generateWordGuess: PuzzleGenerator = ({ seed, width, height }) => {
  const normalizedSeed = normalizeSeed(seed);
  const wordLength = normalizeDimension(width, DEFAULT_WORD_GUESS_LENGTH, WORD_GUESS_MIN_LENGTH, WORD_GUESS_MAX_LENGTH);
  const maxGuesses = normalizeDimension(height, DEFAULT_WORD_GUESS_GUESSES, WORD_GUESS_MIN_GUESSES, WORD_GUESS_MAX_GUESSES);
  const wordBank = getWordGuessBank(wordLength);
  const random = createRandom(`word-guess:${wordBank.dictionaryId}:${wordLength}:${maxGuesses}:${normalizedSeed}`);
  const answerWord = wordBank.answers[Math.floor(random() * wordBank.answers.length)] ?? wordBank.answers[0] ?? "FORGE";

  const cells = Array.from({ length: maxGuesses * wordLength }, (_, index) => {
    const row = Math.floor(index / wordLength);
    const column = index % wordLength;

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
    id: `word-guess-${wordLength}x${maxGuesses}-${normalizedSeed}`,
    puzzleId: "word-guess",
    title: "Word Guess",
    seed: normalizedSeed,
    width: wordLength,
    height: maxGuesses,
    cells,
    answerKey: Array.from(answerWord),
    notes: [
      `${wordLength}-letter Word Guess with ${maxGuesses} attempts from ${wordBank.dictionaryId}.`,
      "Guesses are checked with duplicate-aware exact and present letter feedback.",
      "Classic mode is 5 letters and 6 guesses; custom modes use the same scoring contract.",
    ],
  });
};
