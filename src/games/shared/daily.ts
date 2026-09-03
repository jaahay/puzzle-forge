import type { GeneratedPuzzle, PuzzleDifficulty, PuzzleId, SudokuVariation } from "../../catalog/types";

const dailySeedPrefix = "daily";

export type DailyPuzzleProfile = {
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation?: SudokuVariation;
};

const padDatePart = (value: number) => value.toString().padStart(2, "0");

export const getLocalDateStamp = (date = new Date()) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const getDailyPuzzleSeed = (puzzleId: PuzzleId, date = new Date()) => `${dailySeedPrefix}-${puzzleId}-${getLocalDateStamp(date)}`;

export const getDailyPuzzleLabel = (puzzleId: PuzzleId, seed: string) => {
  const prefix = `${dailySeedPrefix}-${puzzleId}-`;
  const dateStamp = seed.startsWith(prefix) ? seed.slice(prefix.length) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStamp) ? dateStamp : null;
};

export const getDailyPuzzleProfile = (
  puzzleId: PuzzleId,
  selectedSudokuVariation: SudokuVariation = "classic",
): DailyPuzzleProfile | null => {
  if (puzzleId === "nonogram") {
    return {
      width: 8,
      height: 8,
      difficulty: "Medium",
      requireUniqueSolution: true,
    };
  }

  if (puzzleId === "sudoku") {
    return {
      width: 9,
      height: 9,
      difficulty: "Medium",
      requireUniqueSolution: true,
      sudokuVariation: selectedSudokuVariation,
    };
  }

  return null;
};

export const getDailyPuzzleProvenanceLabel = (puzzle: GeneratedPuzzle) =>
  getDailyPuzzleLabel(puzzle.puzzleId, puzzle.seed);

export const getCanonicalDailyPuzzleLabel = getDailyPuzzleProvenanceLabel;
