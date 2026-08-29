import { getPuzzleDefinition } from "../../catalog/puzzleCatalog";
import type { GeneratedPuzzle, PuzzleDifficulty, PuzzleGenerationParams, PuzzleId } from "../../catalog/types";
import { getPuzzleImageAssetsFor, isImageBackedPuzzleId } from "../imageAssets";
import { defaultSolitaireVariation, solitaireVariationsEqual } from "../solitaire/variation";
import { defaultSudokuVariation, normalizeSudokuVariation } from "../sudoku/variation";

const dailySeedPrefix = "daily";
export const canonicalDailyDifficulty: PuzzleDifficulty = "Medium";

export type CanonicalDailyGenerationSettings = Omit<PuzzleGenerationParams, "puzzleId">;

const padDatePart = (value: number) => value.toString().padStart(2, "0");

export const getLocalDateStamp = (date = new Date()) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const getDailyPuzzleSeed = (puzzleId: PuzzleId, date = new Date()) => `${dailySeedPrefix}-${puzzleId}-${getLocalDateStamp(date)}`;

export const getDailyPuzzleLabel = (puzzleId: PuzzleId, seed: string) => {
  const prefix = `${dailySeedPrefix}-${puzzleId}-`;
  const dateStamp = seed.startsWith(prefix) ? seed.slice(prefix.length) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStamp) ? dateStamp : null;
};

export const getCanonicalDailyGenerationSettings = (
  puzzleId: PuzzleId,
  date = new Date(),
): CanonicalDailyGenerationSettings => {
  const definition = getPuzzleDefinition(puzzleId);
  const imageId = isImageBackedPuzzleId(puzzleId) ? getPuzzleImageAssetsFor(puzzleId)[0]?.id : undefined;

  return {
    seed: getDailyPuzzleSeed(puzzleId, date),
    width: definition.defaultWidth,
    height: definition.defaultHeight,
    difficulty: canonicalDailyDifficulty,
    requireUniqueSolution: true,
    sudokuVariation: puzzleId === "sudoku" ? defaultSudokuVariation : undefined,
    solitaireVariation: puzzleId === "klondike-solitaire" ? defaultSolitaireVariation : undefined,
    imageId,
  };
};

export const getCanonicalDailyPuzzleLabel = (puzzle: GeneratedPuzzle) => {
  const dateLabel = getDailyPuzzleLabel(puzzle.puzzleId, puzzle.seed);
  if (!dateLabel) return null;

  const canonical = getCanonicalDailyGenerationSettings(puzzle.puzzleId);
  if (puzzle.width !== canonical.width || puzzle.height !== canonical.height) return null;
  if (puzzle.difficulty !== undefined && puzzle.difficulty !== canonical.difficulty) return null;
  if (puzzle.uniqueSolution !== undefined && Boolean(puzzle.uniqueSolution) !== Boolean(canonical.requireUniqueSolution)) return null;

  if (puzzle.puzzleId === "sudoku" && normalizeSudokuVariation(puzzle.sudokuVariation) !== canonical.sudokuVariation) return null;

  if (puzzle.puzzleId === "klondike-solitaire") {
    if (puzzle.kind !== "cards" || !solitaireVariationsEqual(puzzle.solitaireVariation, canonical.solitaireVariation)) return null;
  }

  if (isImageBackedPuzzleId(puzzle.puzzleId)) {
    if (puzzle.kind !== "tiles" || puzzle.asset.kind !== "image" || puzzle.asset.id !== canonical.imageId) return null;
  }

  return dateLabel;
};
