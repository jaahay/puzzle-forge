import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDefinition, PuzzleDifficulty, PuzzleGenerationRequest, SolitaireVariation, SudokuVariation } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";

export type SolitaireStats = { moveCount: number; drawCount: number; recycleCount: number; autoMoveCount: number };
export type GenerationSettings = Partial<Pick<PuzzleGenerationRequest, "seed" | "width" | "height" | "difficulty