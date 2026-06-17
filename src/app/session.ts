import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDifficulty, PuzzleId } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";

export type SolitaireStats = {
  moveCount: number;
  drawCount: number;
  recycleCount: number;
  autoMoveCount: number;
};

export const initialSolitaireStats: SolitaireStats = {
  moveCount: 0,
  drawCount: 0,
  recycleCount: 0,
  autoMoveCount: 0,
};

export type PuzzleSession = {
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  puzzle: GeneratedPuzzle | null;
  cardStacks: CardStack[] | null;
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  gridCells: PuzzleCell[] | null;
  selectedGridCell: GridCellSelection | null;
  statusMessage: string;
};

export type PuzzleSessionCache = Partial<Record<PuzzleId, PuzzleSession>>;
