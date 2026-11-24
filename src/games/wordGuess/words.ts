import { normalizeDimension } from "../shared";

export type WordGuessLength = 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type WordGuessAnswerBank = {
  answerPoolId: string;
  dictionaryId: string;
  length: WordGuessLength;
  answers: readonly string[];
};

export type WordGuessWordBank = WordGuessAnswerBank & {
  validGuesses: readonly string[];
};

export const WORD_GUESS_MIN_LENGTH = 4;
export const WORD_GUESS_MAX_LENGTH = 12;
export const WORD_GUESS_MIN_GUESSES = 4;
export const WORD_GUESS_MAX_GUESSES = 10;
export const DEFAULT_WORD_GUESS_LENGTH: WordGuessLength = 5;
export const DEFAULT_WORD_GUESS_GUESSES = 6;
export const wordGuessLengths: WordGuessLength[] = [4, 5, 6, 7, 8, 9, 10, 11, 12];

export const normalizeWordGuessLength = (length: number): WordGuessLength =>
  normalizeDimension(length, DEFAULT_WORD_GUESS_LENGTH, WORD_GUESS_MIN_LENGTH, WORD_GUESS_MAX_LENGTH) as WordGuessLength;

export const isSupportedWordGuessLength = (length: number): length is WordGuessLength =>
  Number.isInteger(length) && wordGuessLengths.includes(length as WordGuessLength);

const answersInMemory = new Map<WordGuessLength, WordGuessAnswerBank>();
const pendingAnswers = new Map<WordGuessLength, Promise<WordGuessAnswerBank>>();
const pendingGuesses = new Map<WordGuessLength, Promise<WordGuessWordBank>>();
const guessLookups = new WeakMap<WordGuessWordBank, ReadonlySet<string>>();

export const parseWordGuessAnswers = (text: string, length: WordGuessLength): WordGuessAnswerBank => {
  const words = text.trimEnd().split("\n");
  if (words.length < 30) throw new Error("Word Guess answer pool is incomplete.");
  let previous = "";
  for (const word of words) {
    if (!/^[A-Z]+$/.test(word) || word.length !== length || word <= previous) {
      throw new Error("Word Guess answer pool is malformed or unsorted.");
    }
    previous = word;
  }
  return {
    answerPoolId: `english-${length}-v2`,
    dictionaryId: `esdb-en-US-2026.02.25-${length}`,
    length,
    answers: words,
  };
};

// The synchronous generator may only consume a bank that its worker has loaded.
export const getWordGuessAnswerBank = (length: number): WordGuessAnswerBank => {
  const selected = normalizeWordGuessLength(length);
  const bank = answersInMemory.get(selected);
  if (!bank) throw new Error("Word Guess answers must load before generation.");
  return bank;
};

export const loadWordGuessAnswerBank = (length: number): Promise<WordGuessAnswerBank> => {
  const selected = normalizeWordGuessLength(length);
  const existing = answersInMemory.get(selected);
  if (existing) return Promise.resolve(existing);
  const pending = pendingAnswers.get(selected);
  if (pending) return pending;

  const url = `${import.meta.env.BASE_URL}lexicon/word-guess/answers/${selected}.txt`;
  const request = fetch(url).then(async response => {
    if (!response.ok) throw new Error("Word Guess answers could not be loaded.");
    const bank = parseWordGuessAnswers(await response.text(), selected);
    answersInMemory.set(selected, bank);
    return bank;
  }).catch((reason: unknown) => {
    pendingAnswers.delete(selected);
    throw reason;
  });
  pendingAnswers.set(selected, request);
  return request;
};

export const parseWordGuessGuesses = (text: string, length: WordGuessLength, bank: WordGuessAnswerBank): WordGuessWordBank => {
  if (bank.length !== length) throw new Error("Word Guess bank length mismatch.");
  const words = text.trimEnd().split("\n");
  if (words.length < 1000) throw new Error("Word Guess dictionary is incomplete.");
  let previous = "";
  for (const word of words) {
    if (!/^[A-Z]+$/.test(word) || word.length !== length || word <= previous) {
      throw new Error("Word Guess dictionary is malformed or unsorted.");
    }
    previous = word;
  }
  const lookup = new Set(words);
  if (bank.answers.some(answer => !lookup.has(answer))) {
    throw new Error("Word Guess dictionary is missing eligible answers.");
  }
  return { ...bank, validGuesses: words };
};

export const loadWordGuessBank = (length: number): Promise<WordGuessWordBank> => {
  const selected = normalizeWordGuessLength(length);
  const cached = pendingGuesses.get(selected);
  if (cached) return cached;

  const url = `${import.meta.env.BASE_URL}lexicon/word-guess/${selected}.txt`;
  const request = Promise.all([
    loadWordGuessAnswerBank(selected),
    fetch(url).then(async response => {
      if (!response.ok) throw new Error("Word Guess dictionary could not be loaded.");
      return response.text();
    }),
  ]).then(([answers, guesses]) => parseWordGuessGuesses(guesses, selected, answers))
    .catch((reason: unknown) => {
      pendingGuesses.delete(selected);
      throw reason;
    });
  pendingGuesses.set(selected, request);
  return request;
};

export const normalizeWordGuessWord = (word: string) => word.trim().toUpperCase();

export const isValidWordGuess = (word: string, bank: WordGuessWordBank) => {
  const normalized = normalizeWordGuessWord(word);
  if (normalized.length !== bank.length) return false;
  let lookup = guessLookups.get(bank);
  if (!lookup) {
    lookup = new Set(bank.validGuesses);
    guessLookups.set(bank, lookup);
  }
  return lookup.has(normalized);
};
