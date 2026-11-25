import { scoreWordGuess, wordGuessMarkToEmoji } from "./feedback";

export type WordGuessShareStatus = "playing" | "won" | "lost";

export type WordGuessShareInput = {
  answer: string;
  guesses: readonly string[];
  maxGuesses: number;
  status: WordGuessShareStatus;
};

export const formatWordGuessShareText = ({ answer, guesses, maxGuesses, status }: WordGuessShareInput) => {
  const normalizedAnswer = answer.toUpperCase();
  const normalizedGuesses = guesses.map((guess) => guess.toUpperCase());
  const result = status === "won" ? `Solved · ${normalizedGuesses.length}/${maxGuesses}` : status === "lost" ? `Attempts exhausted · X/${maxGuesses}` : `In progress · ${normalizedGuesses.length}/${maxGuesses}`;
  const rows = normalizedGuesses.map((guess) => scoreWordGuess(normalizedAnswer, guess).map(wordGuessMarkToEmoji).join("")).join("\n");

  return `${result}${rows ? `\n\n${rows}` : ""}`;
};
