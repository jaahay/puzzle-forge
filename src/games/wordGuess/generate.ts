import type { GridPuzzleGenerator } from "../../catalog/types";
import { createGeneratedPuzzle, createRandom, normalizeDimension, normalizeSeed } from "../shared";
import {
  DEFAULT_WORD_GUESS_GUESSES,
  DEFAULT_WORD_GUESS_LENGTH,
  getWordGuessAnswerBank,
  WORD_GUESS_MAX_GUESSES,
  WORD_GUESS_MAX_LENGTH,
  WORD_GUESS_MIN_GUESSES,
  WORD_GUESS_MIN_LENGTH,
} from "./words";

export const generateWordGuess: GridPuzzleGenerator = ({ seed, width, height }) => {
  const normalizedSeed = normalizeSeed(seed);
  const wordLength = normalizeDimension(width, DEFAULT_WORD_GUESS_LENGTH, WORD_GUESS_MIN_LENGTH, WORD_GUESS_MAX_LENGTH);
  const maxGuesses = normalizeDimension(height, DEFAULT_WORD_GUESS_GUESSES, WORD_GUESS_MIN_GUESSES, WORD_GUESS_MAX_GUESSES);
  const wordBank = getWordGuessAnswerBank(wordLength);
  const random = createRandom(`word-guess:${wordBank.answerPoolId}:${wordLength}:${maxGuesses}:${normalizedSeed}`);
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

  const generated = createGeneratedPuzzle({
    id: `word-guess-${wordLength}x${maxGuesses}-${normalizedSeed}`,
    puzzleId: "word-guess",
    title: "Word Guess",
    seed: normalizedSeed,
    width: wordLength,
    height: maxGuesses,
    cells,
    answerKey: Array.from(answerWord),
  });

  // A changed lexicon must not restore guesses against a different answer.
  return { ...generated, checksum: `${generated.checksum}:${answerWord}` };
};
