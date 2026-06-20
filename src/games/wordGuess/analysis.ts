import { scoreWordGuess } from "./feedback";
import type { WordGuessWordBank } from "./words";

export type WordGuessCandidateStep = {
  guess: string;
  before: number;
  after: number;
  eliminated: number;
};

export type WordGuessStarterRank = {
  guess: string;
  averageRemaining: number;
  worstBucket: number;
};

export type WordGuessDifficultyBand = "gentle" | "steady" | "sharp" | "severe";

export type WordGuessAnalysis = {
  candidateCount: number;
  currentCandidates: string[];
  steps: WordGuessCandidateStep[];
  bestStarter: WordGuessStarterRank;
  difficultyBand: WordGuessDifficultyBand;
};

const getPatternKey = (answer: string, guess: string) => scoreWordGuess(answer, guess).join("");

const getObservedPatterns = (answer: string, guesses: readonly string[]) =>
  guesses.map((guess) => ({ guess, pattern: getPatternKey(answer, guess) }));

export const getWordGuessCandidates = (answer: string, guesses: readonly string[], bank: WordGuessWordBank) => {
  const observedPatterns = getObservedPatterns(answer, guesses);

  return bank.answers.filter((candidate) =>
    observedPatterns.every(({ guess, pattern }) => getPatternKey(candidate, guess) === pattern),
  );
};

export const getWordGuessCandidateSteps = (answer: string, guesses: readonly string[], bank: WordGuessWordBank) => {
  let candidates = [...bank.answers];

  return guesses.map((guess) => {
    const before = candidates.length;
    const pattern = getPatternKey(answer, guess);
    candidates = candidates.filter((candidate) => getPatternKey(candidate, guess) === pattern);
    const after = candidates.length;

    return {
      guess,
      before,
      after,
      eliminated: before - after,
    };
  });
};

export const rankWordGuessStarter = (guess: string, bank: WordGuessWordBank): WordGuessStarterRank => {
  const buckets = new Map<string, number>();

  for (const answer of bank.answers) {
    const pattern = getPatternKey(answer, guess);
    buckets.set(pattern, (buckets.get(pattern) ?? 0) + 1);
  }

  const bucketSizes = [...buckets.values()];
  const weightedTotal = bucketSizes.reduce((total, size) => total + size * size, 0);
  const averageRemaining = bank.answers.length === 0 ? 0 : weightedTotal / bank.answers.length;
  const worstBucket = bucketSizes.length === 0 ? 0 : Math.max(...bucketSizes);

  return { guess, averageRemaining, worstBucket };
};

export const getBestWordGuessStarter = (bank: WordGuessWordBank) =>
  bank.validGuesses.map((guess) => rankWordGuessStarter(guess, bank)).sort((left, right) => {
    if (left.averageRemaining !== right.averageRemaining) {
      return left.averageRemaining - right.averageRemaining;
    }

    if (left.worstBucket !== right.worstBucket) {
      return left.worstBucket - right.worstBucket;
    }

    return left.guess.localeCompare(right.guess);
  })[0] ?? { guess: "", averageRemaining: 0, worstBucket: 0 };

export const getWordGuessDifficultyBand = (bestStarter: WordGuessStarterRank, bank: WordGuessWordBank): WordGuessDifficultyBand => {
  const answerCount = Math.max(1, bank.answers.length);
  const averageRatio = bestStarter.averageRemaining / answerCount;
  const worstRatio = bestStarter.worstBucket / answerCount;

  if (averageRatio <= 0.18 && worstRatio <= 0.35) {
    return "gentle";
  }

  if (averageRatio <= 0.3 && worstRatio <= 0.5) {
    return "steady";
  }

  if (averageRatio <= 0.45 && worstRatio <= 0.68) {
    return "sharp";
  }

  return "severe";
};

export const getWordGuessAnalysis = (answer: string, guesses: readonly string[], bank: WordGuessWordBank): WordGuessAnalysis => {
  const currentCandidates = getWordGuessCandidates(answer, guesses, bank);
  const bestStarter = getBestWordGuessStarter(bank);

  return {
    candidateCount: currentCandidates.length,
    currentCandidates,
    steps: getWordGuessCandidateSteps(answer, guesses, bank),
    bestStarter,
    difficultyBand: getWordGuessDifficultyBand(bestStarter, bank),
  };
};
