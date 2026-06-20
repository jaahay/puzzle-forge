import { isSolvedWordGuess, scoreWordGuess, type WordGuessMark } from "./feedback";
import { isValidWordGuess, type WordGuessWordBank } from "./words";

export type WordGuessStatus = "playing" | "won" | "lost";

export type WordGuessGuess = {
  guess: string;
  marks: WordGuessMark[];
};

export type WordGuessState = {
  answer: string;
  currentInput: string;
  guesses: WordGuessGuess[];
  status: WordGuessStatus;
  message: string;
};

export type WordGuessAction =
  | { type: "input-letter"; letter: string }
  | { type: "backspace" }
  | { type: "submit" }
  | { type: "reset"; answer: string };

export type WordGuessRules = {
  answer: string;
  maxGuesses: number;
  wordBank: WordGuessWordBank;
};

export const createWordGuessState = (answer: string): WordGuessState => ({
  answer: answer.toUpperCase(),
  currentInput: "",
  guesses: [],
  status: "playing",
  message: "Enter a guess.",
});

const normalizeLetterInput = (letter: string) => {
  const letters = Array.from(letter.toUpperCase()).filter((character) => character >= "A" && character <= "Z");
  return letters[letters.length - 1] ?? "";
};

export const reduceWordGuess = (state: WordGuessState, action: WordGuessAction, rules: WordGuessRules): WordGuessState => {
  if (action.type === "reset") {
    return createWordGuessState(action.answer);
  }

  if (state.status !== "playing") {
    return state;
  }

  if (action.type === "input-letter") {
    const letter = normalizeLetterInput(action.letter);

    if (!letter || state.currentInput.length >= rules.wordBank.length) {
      return state;
    }

    return { ...state, currentInput: `${state.currentInput}${letter}`, message: "Enter a guess." };
  }

  if (action.type === "backspace") {
    return { ...state, currentInput: state.currentInput.slice(0, -1), message: "Enter a guess." };
  }

  const guess = state.currentInput.toUpperCase();

  if (guess.length !== rules.wordBank.length) {
    return { ...state, message: `Enter ${rules.wordBank.length} letters.` };
  }

  if (!isValidWordGuess(guess, rules.wordBank)) {
    return { ...state, message: `${guess} is not in the ${rules.wordBank.length}-letter guess list.` };
  }

  const nextGuess: WordGuessGuess = {
    guess,
    marks: scoreWordGuess(rules.answer, guess),
  };
  const guesses = [...state.guesses, nextGuess];
  const won = isSolvedWordGuess(rules.answer, guess);
  const lost = !won && guesses.length >= rules.maxGuesses;

  return {
    ...state,
    currentInput: "",
    guesses,
    status: won ? "won" : lost ? "lost" : "playing",
    message: won ? `Solved in ${guesses.length}/${rules.maxGuesses}.` : lost ? `No match. The word was ${rules.answer}.` : `${rules.maxGuesses - guesses.length} attempt(s) remain.`,
  };
};
