import type {
  GeneratedPuzzle,
  JigsawCutStyle,
  PuzzleDifficulty,
  PuzzleId,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";
import { isImageBackedPuzzleId } from "../games/imageAssets";
import { normalizeJigsawCutStyle } from "../games/jigsaw/cutStyle";
import { normalizeSolitaireVariation, solitaireVariationsEqual } from "../games/solitaire/variation";
import { normalizeSudokuVariation } from "../games/sudoku/variation";
import { puzzleProvenanceMatches, type PuzzleProvenance } from "./puzzleProvenance";

export type GenerationRuntimeSettings = {
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation: SudokuVariation;
  solitaireVariation: SolitaireVariation;
  jigsawCutStyle?: JigsawCutStyle;
};

export type GenerationIdentity = GenerationRuntimeSettings & {
  puzzleId: PuzzleId;
  imageId?: string;
  provenance?: PuzzleProvenance;
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
  jigsawCutStyle:
    puzzle.kind === "tiles" && puzzle.puzzleId === "jigsaw"
      ? normalizeJigsawCutStyle(puzzle.edgeModel.cutStyle)
      : fallback.jigsawCutStyle,
});

export const generatedPuzzleMatchesIdentity = (
  puzzle: GeneratedPuzzle | null,
  identity: GenerationIdentity,
) => {
  if (
    !puzzle ||
    puzzle.puzzleId !== identity.puzzleId ||
    puzzle.seed !== identity.seed ||
    !puzzleProvenanceMatches(puzzle, identity.provenance)
  ) {
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

  if (puzzle.puzzleId === "jigsaw") {
    return (
      puzzle.kind === "tiles" &&
      puzzle.width === identity.width &&
      puzzle.height === identity.height &&
      puzzle.asset.id === identity.imageId &&
      normalizeJigsawCutStyle(puzzle.edgeModel.cutStyle) ===
        normalizeJigsawCutStyle(identity.jigsawCutStyle)
    );
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
