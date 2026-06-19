export type WordGuessLength = 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type WordGuessWordBank = {
  dictionaryId: string;
  length: WordGuessLength;
  answers: readonly string[];
  validGuesses: readonly string[];
};

export const WORD_GUESS_MIN_LENGTH = 4;
export const WORD_GUESS_MAX_LENGTH = 12;
export const WORD_GUESS_MIN_GUESSES = 4;
export const WORD_GUESS_MAX_GUESSES = 10;
export const DEFAULT_WORD_GUESS_LENGTH: WordGuessLength = 5;
export const DEFAULT_WORD_GUESS_GUESSES = 6;

const wordBanks = {
  4: {
    dictionaryId: "curated-4-v1",
    length: 4,
    answers: ["CODE", "MIND", "GRID", "CLUE", "TILE", "PLAY", "WORD", "GAME", "MATH", "LOOP", "NODE", "PATH"],
    validGuesses: ["CODE", "MIND", "GRID", "CLUE", "TILE", "PLAY", "WORD", "GAME", "MATH", "LOOP", "NODE", "PATH", "MOVE", "MARK", "TURN", "FIND"],
  },
  5: {
    dictionaryId: "curated-5-v1",
    length: 5,
    answers: ["FORGE", "LOGIC", "GRIDS", "CLUES", "SOLVE", "BRAIN", "LEVEL", "CHAIN", "CIVIC", "ABBEY", "CRANE", "SLATE", "TRACE", "BOUND"],
    validGuesses: [
      "FORGE",
      "LOGIC",
      "GRIDS",
      "CLUES",
      "SOLVE",
      "BRAIN",
      "LEVEL",
      "CHAIN",
      "CIVIC",
      "ABBEY",
      "CRANE",
      "SLATE",
      "TRACE",
      "BOUND",
      "RAISE",
      "ROUTE",
      "POINT",
      "STACK",
      "FIELD",
      "MATCH",
    ],
  },
  6: {
    dictionaryId: "curated-6-v1",
    length: 6,
    answers: ["PUZZLE", "REASON", "LETTER", "ANSWER", "SEARCH", "STREAM", "BRIDGE", "MATRIX", "TARGET", "COLUMN", "FILTER"],
    validGuesses: ["PUZZLE", "REASON", "LETTER", "ANSWER", "SEARCH", "STREAM", "BRIDGE", "MATRIX", "TARGET", "COLUMN", "FILTER", "VECTOR", "DOMAIN", "SCRIPT"],
  },
  7: {
    dictionaryId: "curated-7-v1",
    length: 7,
    answers: ["PATTERN", "SOLVERS", "WORDING", "SEEDING", "NETWORK", "BALANCE", "VICTORY", "FOUNDRY", "CHECKER", "ANALYZE"],
    validGuesses: ["PATTERN", "SOLVERS", "WORDING", "SEEDING", "NETWORK", "BALANCE", "VICTORY", "FOUNDRY", "CHECKER", "ANALYZE", "CANDLES", "PROCESS"],
  },
  8: {
    dictionaryId: "curated-8-v1",
    length: 8,
    answers: ["NOTEBOOK", "SOLUTION", "FEEDBACK", "KEYBOARD", "PLAYTEST", "STRATEGY", "HARDMODE", "WORDLIST", "ANALYSIS"],
    validGuesses: ["NOTEBOOK", "SOLUTION", "FEEDBACK", "KEYBOARD", "PLAYTEST", "STRATEGY", "HARDMODE", "WORDLIST", "ANALYSIS", "DATABASE", "FUNCTION"],
  },
  9: {
    dictionaryId: "curated-9-v1",
    length: 9,
    answers: ["DEDUCTION", "ALGORITHM", "CROSSWORD", "GUESSWORK", "FRAMEWORK", "PLAYFIELD", "VALIDATOR", "GENERATOR"],
    validGuesses: ["DEDUCTION", "ALGORITHM", "CROSSWORD", "GUESSWORK", "FRAMEWORK", "PLAYFIELD", "VALIDATOR", "GENERATOR", "WORKSPACE", "REFERENCE"],
  },
  10: {
    dictionaryId: "curated-10-v1",
    length: 10,
    answers: ["GENERATION", "VALIDATION", "CANDIDATES", "INTERLOCKS", "COMPLETION", "DICTIONARY", "CONSTRAINT", "PARAMETRIC"],
    validGuesses: ["GENERATION", "VALIDATION", "CANDIDATES", "INTERLOCKS", "COMPLETION", "DICTIONARY", "CONSTRAINT", "PARAMETRIC", "CALCULATOR", "STRUCTURED"],
  },
  11: {
    dictionaryId: "curated-11-v1",
    length: 11,
    answers: ["CONFIGURING", "INTERACTIVE", "EXPLORATION", "CONSTRAINTS", "ENGINEERING", "RESPONSIBLE"],
    validGuesses: ["CONFIGURING", "INTERACTIVE", "EXPLORATION", "CONSTRAINTS", "ENGINEERING", "RESPONSIBLE", "DESCRIPTION", "PERFORMANCE"],
  },
  12: {
    dictionaryId: "curated-12-v1",
    length: 12,
    answers: ["CONFIGURABLE", "ARCHITECTURE", "CALIBRATIONS", "EXPERIMENTAL", "INTERACTIONS", "DETERMINABLE"],
    validGuesses: ["CONFIGURABLE", "ARCHITECTURE", "CALIBRATIONS", "EXPERIMENTAL", "INTERACTIONS", "DETERMINABLE", "PRESENTATION", "OPTIMIZATIONS"],
  },
} as const satisfies Record<WordGuessLength, WordGuessWordBank>;

export const wordGuessLengths = Object.keys(wordBanks).map(Number) as WordGuessLength[];

export const isSupportedWordGuessLength = (length: number): length is WordGuessLength =>
  Number.isInteger(length) && length >= WORD_GUESS_MIN_LENGTH && length <= WORD_GUESS_MAX_LENGTH && length in wordBanks;

export const getWordGuessBank = (length: number): WordGuessWordBank => {
  if (isSupportedWordGuessLength(length)) {
    return wordBanks[length];
  }

  return wordBanks[DEFAULT_WORD_GUESS_LENGTH];
};

export const normalizeWordGuessWord = (word: string) => word.trim().toUpperCase();

export const isValidWordGuess = (word: string, bank: WordGuessWordBank) => {
  const normalizedWord = normalizeWordGuessWord(word);
  return normalizedWord.length === bank.length && bank.validGuesses.includes(normalizedWord);
};
