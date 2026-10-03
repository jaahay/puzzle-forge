import { getDailyPuzzleLabel, getDailyPuzzleSeed, getLocalDateStamp as getSharedLocalDateStamp } from "../shared/daily";

export const getLocalDateStamp = getSharedLocalDateStamp;

export const getWordGuessDailySeed = (date = new Date()) => getDailyPuzzleSeed("word-guess", date);

export const getWordGuessDailyLabel = (seed: string) => getDailyPuzzleLabel("word-guess", seed);
