import type { PuzzleId } from "../../catalog/types";

const dailySeedPrefix = "daily";

const padDatePart = (value: number) => value.toString().padStart(2, "0");

export const getLocalDateStamp = (date = new Date()) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const getDailyPuzzleSeed = (puzzleId: PuzzleId, date = new Date()) => `${dailySeedPrefix}-${puzzleId}-${getLocalDateStamp(date)}`;

export const getDailyPuzzleLabel = (puzzleId: PuzzleId, seed: string) => {
  const prefix = `${dailySeedPrefix}-${puzzleId}-`;
  const dateStamp = seed.startsWith(prefix) ? seed.slice(prefix.length) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStamp) ? dateStamp : null;
};
