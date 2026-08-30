import type { CardGeneratedPuzzle, CardStack, GeneratedPuzzle, GridGeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";
import {
  loadPersistedPuzzleSessions as loadPersistedPuzzleSessionsUnsafe,
  savePersistedPuzzleSessions as savePersistedPuzzleSessionsUnsafe,
  type RuntimePuzzleSessions,
} from "./sessionPersistence";
export { puzzleIds, solitaireHistoryLimit, solitaireHistoryLimitNotice } from "./sessionConstants";
export * from "./sessionPersistence";

export type SolitaireStats = {
  moveCount: number;
  drawCount: number;
  recycleCount: number;
  autoMoveCount: number;
};

export type SolitaireHistoryEntry = {
  cardStacks: CardStack[];
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  statusMessage: string;
};

export const initialSolitaireStats: SolitaireStats = {
  moveCount: 0,
  drawCount: 0,
  recycleCount: 0,
  autoMoveCount: 0,
};

export type CardSessionProgress = {
  kind: "cards";
  cardStacks: CardStack[];
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  undoStack: SolitaireHistoryEntry[];
  redoStack: SolitaireHistoryEntry[];
};

export type GridSessionProgress = {
  kind: "grid";
  cells: PuzzleCell[];
  selectedCell: GridCellSelection | null;
};

export type TileSessionProgress = {
  kind: "tiles";
};

type TileGeneratedPuzzle = Exclude<GeneratedPuzzle, CardGeneratedPuzzle | GridGeneratedPuzzle>;

export type PuzzleSession =
  | {
      kind: "cards";
      puzzle: CardGeneratedPuzzle;
      progress: CardSessionProgress;
      statusMessage: string;
    }
  | {
      kind: "grid";
      puzzle: GridGeneratedPuzzle;
      progress: GridSessionProgress;
      statusMessage: string;
    }
  | {
      kind: "tiles";
      puzzle: TileGeneratedPuzzle;
      progress: TileSessionProgress;
      statusMessage: string;
    };

export type PuzzleSessionCache = Partial<Record<PuzzleId, PuzzleSession>>;

export const loadPersistedPuzzleSessions = () => {
  try {
    return loadPersistedPuzzleSessionsUnsafe();
  } catch {
    return null;
  }
};

export const savePersistedPuzzleSessions = (sessions: RuntimePuzzleSessions) => {
  try {
    savePersistedPuzzleSessionsUnsafe(sessions);
  } catch {
    // Persistence is optional. Keep the in-memory game usable when storage is unavailable.
  }
};
