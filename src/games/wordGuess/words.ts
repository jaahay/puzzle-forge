import answerLists from "../../../assets/lexicon/word-guess-answers.json";

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
export const wordGuessLengths: WordGuessLength[] = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const curated = answerLists as Record<WordGuessLength, readonly string[]>;

const baseBanks = Object.fromEntries(wordGuessLengths.map((length) => [length, {
  dictionaryId: `esdb-en-US-2026.02.25-${length}`,
  length,
  answers: curated[length],
  validGuesses: curated[length],
}])) as Record<WordGuessLength, WordGuessWordBank>;

export const isSupportedWordGuessLength = (length: number): length is WordGuessLength =>
  Number.isInteger(length) && wordGuessLengths.includes(length as WordGuessLength);

export const getWordGuessBank = (length: number): WordGuessWordBank =>
  baseBanks[isSupportedWordGuessLength(length) ? length : DEFAULT_WORD_GUESS_LENGTH];

const loadedBanks = new Map<WordGuessLength, Promise<WordGuessWordBank>>();
const lookups = new WeakMap<WordGuessWordBank, ReadonlySet<string>>();

export const parseWordGuessGuesses = (text: string, length: WordGuessLength): WordGuessWordBank => {
  const base = getWordGuessBank(length);
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
  if (base.answers.some((answer) => !lookup.has(answer))) {
    throw new Error("Word Guess dictionary is missing eligible answers.");
  }
  return { ...base, validGuesses: words };
};

export const loadWordGuessBank = (length: number): Promise<WordGuessWordBank> => {
  const selected = isSupportedWordGuessLength(length) ? length : DEFAULT_WORD_GUESS_LENGTH;
  const cached = loadedBanks.get(selected);
  if (cached) return cached;

  const url = `${import.meta.env.BASE_URL}lexicon/word-guess/${selected}.txt`;
  const pending = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error("Word Guess dictionary could not be loaded.");
    return parseWordGuessGuesses(await response.text(), selected);
  }).catch((error: unknown) => {
    loadedBanks.delete(selected);
    throw error;
  });
  loadedBanks.set(selected, pending);
  return pending;
};

export const normalizeWordGuessWord = (word: string) => word.trim().toUpperCase();

export const isValidWordGuess = (word: string, bank: WordGuessWordBank) => {
  const normalized = normalizeWordGuessWord(word);
  if (normalized.length !== bank.length) return false;
  let lookup = lookups.get(bank);
  if (!lookup) {
    lookup = new Set(bank.validGuesses);
    lookups.set(bank, lookup);
  }
  return lookup.has(normalized);
};
