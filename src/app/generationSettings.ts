import type {
  PuzzleDifficulty,
  PuzzleGenerationRequest,
  SolitaireVariation,
  SudokuVariation,
} from "../catalog/types";

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
