import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import type {
  GeneratedPuzzle,
  PuzzleDifficulty,
  PuzzleGenerationRequest,
  PuzzleId,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";
import { normalizeSolitaireVariation } from "../games/solitaire/variation";
import { normalizeSudokuVariation } from "../games/sudoku/variation";
import type { GenerationIdentity, GenerationRuntimeSettings } from "./generationIdentity";

export type GenerationSettings = Partial<
  Pick<
    PuzzleGenerationRequest,
    | "seed"
    | "width"
    | "height"
    | "difficulty"
    | "requireUniqueSolution"
    | "sudokuVariation"
    | "solitaireVariation"
    | "imageId"
  >
>;

export type NextPuzzleDraft = {
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation: SudokuVariation;
  solitaireVariation: SolitaireVariation;
};

type ResolveGenerationIdentityInput = {
  puzzleId: PuzzleId;
  currentPuzzle: GeneratedPuzzle | null;
  runtimeSettings: GenerationRuntimeSettings;
  settings?: GenerationSettings;
  makeSeed: () => string;
};

export const resolveGenerationIdentity = ({
  puzzleId,
  currentPuzzle,
  runtimeSettings,
  settings = {},
  makeSeed,
}: ResolveGenerationIdentityInput): GenerationIdentity => {
  const definition = getPuzzleDefinition(puzzleId);
  const explicitSeed = typeof settings.seed === "string" ? settings.seed.trim() : null;
  const seed = (explicitSeed ?? runtimeSettings.seed.trim()) || currentPuzzle?.seed || makeSeed();
  const width = Number.isFinite(settings.width) ? Number(settings.width) : runtimeSettings.width || definition.defaultWidth;
  const height = Number.isFinite(settings.height) ? Number(settings.height) : runtimeSettings.height || definition.defaultHeight;
  const difficulty = settings.difficulty ?? runtimeSettings.difficulty;
  const requireUniqueSolution = typeof settings.requireUniqueSolution === "boolean"
    ? settings.requireUniqueSolution
    : runtimeSettings.requireUniqueSolution;
  const sudokuVariation = normalizeSudokuVariation(
    settings.sudokuVariation ??
      (currentPuzzle?.puzzleId === "sudoku" ? currentPuzzle.sudokuVariation : undefined) ??
      runtimeSettings.sudokuVariation,
  );
  const solitaireVariation = normalizeSolitaireVariation(
    settings.solitaireVariation ??
      (currentPuzzle?.kind === "cards" ? currentPuzzle.solitaireVariation : undefined) ??
      runtimeSettings.solitaireVariation,
  );
  const currentImageId =
    currentPuzzle?.kind === "tiles" && currentPuzzle.puzzleId === puzzleId && currentPuzzle.asset.kind === "image"
      ? currentPuzzle.asset.id
      : undefined;

  return {
    puzzleId,
    seed,
    width,
    height,
    difficulty,
    requireUniqueSolution,
    sudokuVariation,
    solitaireVariation,
    imageId: settings.imageId ?? currentImageId,
  };
};
