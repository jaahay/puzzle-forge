import { normalizeDimension } from "../shared";

export type WordGuessLength = 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type WordGuessAnswerBank = {
  answerPoolId: string;
  dictionaryId: string;
  length: WordGuessLength;
  answers: readonly string[];
};

export type WordGuessStarter = {
  guess: string;
  weightedTotal: number;
  worstBucket: number;
};

export type WordGuessWordBank = WordGuessAnswerBank & {
  validGuesses: readonly string[];
  starter: WordGuessStarter;
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

const pendingBanks = new Map<WordGuessLength, Promise<WordGuessWordBank>>();
const guessLookups = new WeakMap<WordGuessWordBank, ReadonlySet<string>>();

const parseWords = (value: unknown, length: WordGuessLength, minimum: number): string[] => {
  if (!Array.isArray(value) || value.length < minimum) throw new Error("Word Guess bank is incomplete.");
  let previous = "";
  for (const word of value) {
    if (typeof word !== "string" || !/^[A-Z]+$/.test(word) || word.length !== length || word <= previous) {
      throw new Error("Word Guess bank is malformed or unsorted.");
    }
    previous = word;
  }
  return value;
};

export const parseWordGuessBank = (text: string, length: WordGuessLength): WordGuessWordBank => {
  const value = JSON.parse(text) as { answers?: unknown; validGuesses?: unknown; starter?: Partial<WordGuessStarter> } | null;
  const answers = parseWords(value?.answers, length, 30);
  const validGuesses = parseWords(value?.validGuesses, length, 1000);
  const lookup = new Set(validGuesses);
  if (answers.some(answer => !lookup.has(answer))) throw new Error("Word Guess dictionary is missing eligible answers.");
  const starter = value?.starter;
  if (!starter || typeof starter.guess !== "string" || !lookup.has(starter.guess)
      || typeof starter.weightedTotal !== "number" || !Number.isSafeInteger(starter.weightedTotal)
      || starter.weightedTotal < answers.length || starter.weightedTotal > answers.length ** 2
      || typeof starter.worstBucket !== "number" || !Number.isSafeInteger(starter.worstBucket)
      || starter.worstBucket < 1 || starter.worstBucket > answers.length) {
    throw new Error("Word Guess starter statistics are malformed.");
  }
  const bank: WordGuessWordBank = {
    answerPoolId: `english-${length}-v2`,
    dictionaryId: `esdb-en-US-2026.02.25-${length}`,
    length, answers, validGuesses,
    starter: { guess: starter.guess, weightedTotal: starter.weightedTotal, worstBucket: starter.worstBucket },
  };
  guessLookups.set(bank, lookup);
  return bank;
};

export const loadWordGuessBank = (length: number): Promise<WordGuessWordBank> => {
  const selected = normalizeWordGuessLength(length);
  const cached = pendingBanks.get(selected);
  if (cached) return cached;
  const url = `${import.meta.env.BASE_URL}lexicon/word-guess/banks/${selected}.json`;
  const request = fetch(url).then(async response => {
    if (!response.ok) throw new Error("Word Guess word list could not be loaded.");
    return parseWordGuessBank(await response.text(), selected);
  }).catch((reason: unknown) => {
    pendingBanks.delete(selected);
    throw reason;
  });
  pendingBanks.set(selected, request);
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

export const isWordGuessAnswer = (answer: string, bank: WordGuessAnswerBank) =>
  bank.answers.includes(answer);
