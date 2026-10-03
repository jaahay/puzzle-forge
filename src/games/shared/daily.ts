import type { PuzzleDifficulty, PuzzleId, SudokuVariation } from "../../catalog/types";

const dailySeedPrefix = "daily";
const dailySeedDerivationVersion = "v1";

export type DailyPuzzleGenerationProfile = {
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation?: SudokuVariation;
};

const padDatePart = (value: number) => value.toString().padStart(2, "0");
const dailyDateStampPattern = /^\d{4}-\d{2}-\d{2}$/;
const shortMonthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const isLeapYear = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
const daysInMonth = (year: number, month: number) => [
  31,
  isLeapYear(year) ? 29 : 28,
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31,
][month - 1] ?? 0;

export const isDailyDateStamp = (dateStamp: string) => {
  if (!dailyDateStampPattern.test(dateStamp)) return false;
  const [year, month, day] = dateStamp.split("-").map(Number);
  return year >= 0 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
};

export const formatDailyDateStamp = (dateStamp: string, currentDateStamp?: string) => {
  if (!isDailyDateStamp(dateStamp)) return dateStamp;
  const [year, month, day] = dateStamp.split("-").map(Number);
  const currentYear = currentDateStamp?.split("-")[0];
  const yearSuffix = currentYear === String(year) ? "" : `, ${year}`;
  return `${shortMonthLabels[month - 1]} ${day}${yearSuffix}`;
};

const hashDailySeedMaterial = (material: string) => {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (const character of material) {
    const codePoint = character.codePointAt(0) ?? 0;
    first = Math.imul(first ^ codePoint, 0x01000193);
    second = Math.imul(second ^ codePoint, 0x85ebca6b);
  }

  return `${(first >>> 0).toString(36).padStart(7, "0")}${(second >>> 0).toString(36).padStart(7, "0")}`;
};

export const getLocalDateStamp = (date = new Date()) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

// Date-scoped daily seeds remain useful to puzzle families such as Word Guess.
// Sudoku and Nonogram daily tracks use getDailyPuzzleSeedForProfile instead; their
// provenance is carried explicitly by the app rather than reconstructed from a seed.
export const getDailyPuzzleSeed = (puzzleId: PuzzleId, date = new Date()) =>
  `${dailySeedPrefix}-${puzzleId}-${getLocalDateStamp(date)}`;

export const getDailyPuzzleLabel = (puzzleId: PuzzleId, seed: string) => {
  const prefix = `${dailySeedPrefix}-${puzzleId}-`;
  if (!seed.startsWith(prefix)) return null;

  const dateStamp = seed.slice(prefix.length);
  return isDailyDateStamp(dateStamp) ? dateStamp : null;
};

export const getDailyPuzzleSeedForProfile = (
  puzzleId: PuzzleId,
  dateStamp: string,
  profile: DailyPuzzleGenerationProfile,
) => {
  const difficulty = profile.difficulty.toLowerCase();
  const parts = [dailySeedDerivationVersion, puzzleId, dateStamp, difficulty];

  if (puzzleId === "sudoku") {
    parts.push(profile.sudokuVariation ?? "classic");
  } else if (puzzleId === "nonogram") {
    parts.push(`${profile.width}x${profile.height}`);
    parts.push(profile.requireUniqueSolution ? "unique" : "unchecked");
  } else {
    return getDailyPuzzleSeed(puzzleId, new Date(`${dateStamp}T12:00:00`));
  }

  return hashDailySeedMaterial(parts.join("|"));
};
