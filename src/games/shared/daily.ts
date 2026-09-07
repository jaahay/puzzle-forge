import type { GeneratedPuzzle, PuzzleDifficulty, PuzzleId, SudokuVariation } from "../../catalog/types";

const dailySeedPrefix = "daily";

export type DailyPuzzleGenerationProfile = {
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation?: SudokuVariation;
};

const padDatePart = (value: number) => value.toString().padStart(2, "0");
const dailyDateStampPattern = /^\d{4}-\d{2}-\d{2}$/;
const difficultySeedPart = "(?:easy|medium|hard|expert)";

const isValidDailyProfileSuffix = (puzzleId: PuzzleId, suffix: string) => {
  if (!suffix) return true;
  if (puzzleId === "sudoku") {
    return new RegExp(`^-${difficultySeedPart}-(?:classic|diagonal|zero-killer)$`).test(suffix);
  }
  if (puzzleId === "nonogram") {
    return new RegExp(`^-${difficultySeedPart}-\\d+x\\d+-(?:unique|unchecked)$`).test(suffix);
  }
  return false;
};

export const getLocalDateStamp = (date = new Date()) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const getDailyPuzzleSeed = (puzzleId: PuzzleId, date = new Date()) =>
  `${dailySeedPrefix}-${puzzleId}-${getLocalDateStamp(date)}`;

export const getDailyPuzzleLabel = (puzzleId: PuzzleId, seed: string) => {
  const prefix = `${dailySeedPrefix}-${puzzleId}-`;
  if (!seed.startsWith(prefix)) return null;

  const remainder = seed.slice(prefix.length);
  const dateStamp = remainder.slice(0, 10);
  const profileSuffix = remainder.slice(10);
  return dailyDateStampPattern.test(dateStamp) && isValidDailyProfileSuffix(puzzleId, profileSuffix)
    ? dateStamp
    : null;
};

export const getDailyPuzzleSeedForProfile = (
  puzzleId: PuzzleId,
  dateStamp: string,
  profile: DailyPuzzleGenerationProfile,
) => {
  const baseSeed = `${dailySeedPrefix}-${puzzleId}-${dateStamp}`;
  const difficulty = profile.difficulty.toLowerCase();

  if (puzzleId === "sudoku") {
    return `${baseSeed}-${difficulty}-${profile.sudokuVariation ?? "classic"}`;
  }

  if (puzzleId === "nonogram") {
    const uniqueness = profile.requireUniqueSolution ? "unique" : "unchecked";
    return `${baseSeed}-${difficulty}-${profile.width}x${profile.height}-${uniqueness}`;
  }

  return baseSeed;
};

export const getDailyPuzzleProvenanceLabel = (puzzle: GeneratedPuzzle) =>
  getDailyPuzzleLabel(puzzle.puzzleId, puzzle.seed);

export const getCanonicalDailyPuzzleLabel = getDailyPuzzleProvenanceLabel;
