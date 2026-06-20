import { scoreWordGuess, wordGuessMarkToEmoji } from "./feedback";

export type WordGuessShareStatus = "playing" | "won" | "lost";

export type WordGuessShareInput = {
  title: string;
  seed: string;
  answer: string;
  guesses: readonly string[];
  maxGuesses: number;
  status: WordGuessShareStatus;
};

export const formatWordGuessShareText = ({ title, seed, answer, guesses, maxGuesses, status }: WordGuessShareInput) => {
  const normalizedAnswer = answer.toUpperCase();
  const normalizedGuesses = guesses.map((guess) => guess.toUpperCase());
  const result = status === "won" ? `${normalizedGuesses.length}/${maxGuesses}` : status === "lost" ? `X/${maxGuesses}` : `${normalizedGuesses.length}/${maxGuesses}`;
  const rows = normalizedGuesses.map((guess) => scoreWordGuess(normalizedAnswer, guess).map(wordGuessMarkToEmoji).join("")).join("\n");

  return `${title} ${normalizedAnswer.length}×${maxGuesses} ${seed} ${result}${rows ? `\n\n${rows}` : ""}`;
};
