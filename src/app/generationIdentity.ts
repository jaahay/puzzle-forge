import type {
  GeneratedPuzzle,
  PuzzleDifficulty,
  PuzzleId,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";
import { isImageBackedPuzzleId } from "../games/imageAssets";
import { normalizeSolitaireVariation, solitaireVariationsEqual } from "../games/solitaire/variation";
import { normalizeSudokuVariation } from "../games/sudoku/variation";

export type GenerationRuntimeSettings = {
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation: SudokuVariation;
  solitaireVariation: SolitaireVariation;
};

export type GenerationIdentity = GenerationRuntimeSettings & {
  puzzleId: PuzzleId;
  imageId?: string;
};

export const getGeneratedPuzzleRuntimeSettings = (
  puzzle: GeneratedPuzzle,
  fallback: GenerationRuntimeSettings,
): GenerationRuntimeSettings => ({
  seed: puzzle.seed,
  width: puzzle.width,
  height: puzzle.height,
  difficulty: puzzle.difficulty ?? fallback.difficulty,
  requireUniqueSolution: puzzle.uniqueSolution ?? fallback.requireUniqueSolution,
  sudokuVariation:
    puzzle.puzzleId === "sudoku"
      ? normalizeSudokuVariation(puzzle.sudokuVariation)
      : fallback.sudokuVariation,
  solitaireVariation:
    puzzle.kind === "cards"
      ? normalizeSolitaireVariation(puzzle.solitaireVariation)
      : fallback.solitaireVariation,
});

export const generatedPuzzleMatchesIdentity = (
  puzzle: GeneratedPuzzle | null,
  identity: GenerationIdentity,
) => {
  if (!puzzle || puzzle.puzzleId !== identity.puzzleId || puzzle.seed !== identity.seed) {
    return false;
  }

  if (puzzle.kind === "grid" && (puzzle.width !== identity.width || puzzle.height !== identity.height)) {
    return false;
  }

  if (
    puzzle.puzzleId === "sudoku" &&
    (puzzle.difficulty !== identity.difficulty ||
      normalizeSudokuVariation(puzzle.sudokuVariation) !== normalizeSudokuVariation(identity.sudokuVariation))
  ) {
    return false;
  }

  if (
    puzzle.puzzleId === "nonogram" &&
    (puzzle.difficulty !== identity.difficulty || Boolean(puzzle.uniqueSolution) !== identity.requireUniqueSolution)
  ) {
    return false;
  }

  if (puzzle.puzzleId === "futoshiki" && puzzle.difficulty !== identity.difficulty) {
    return false;
  }

  if (
    puzzle.puzzleId === "klondike-solitaire" &&
    (puzzle.kind !== "cards" ||
      !solitaireVariationsEqual(
        normalizeSolitaireVariation(puzzle.solitaireVariation),
        normalizeSolitaireVariation(identity.solitaireVariation),
      ))
  ) {
    return false;
  }

  if (isImageBackedPuzzleId(puzzle.puzzleId)) {
    return (
      puzzle.kind === "tiles" &&
      puzzle.width === identity.width &&
      puzzle.height === identity.height &&
      puzzle.asset.id === identity.imageId
    );
  }

  return true;
};