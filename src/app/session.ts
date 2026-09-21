import type { CardGeneratedPuzzle, CardStack, GeneratedPuzzle, GridGeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";
import type { GridHistoryEntry } from "./gridHistory";
import {
  loadPersistedPuzzleSessions as loadPersistedPuzzleSessionsUnsafe,
  savePersistedPuzzleSessions as savePersistedPuzzleSessionsUnsafe,
  type RuntimePuzzleSessions,
} from "./sessionPersistence";
import {
  finalizePuzzleSessionRetention,
  preparePuzzleSessionRetention,
} from "./sessionRetention";
export { puzzleIds, solitaireHistoryLimit, solitaireHistoryLimitNotice } from "./sessionConstants";
export * from "./sessionPersistence";
export { persistedPuzzleSessionLimit } from "./sessionRetention";

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
  undoStack?: GridHistoryEntry[];
  redoStack?: GridHistoryEntry[];
};

export type TileSessionProgress = {
  kind: "tiles";
  jigsawSnappedPieceIds?: string[];
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
    if (!sessions.sessions[sessions.activeResourceKey]) {
      savePersistedPuzzleSessionsUnsafe(sessions);
      return;
    }

    preparePuzzleSessionRetention(sessions.activeResourceKey);
    savePersistedPuzzleSessionsUnsafe(sessions);
    finalizePuzzleSessionRetention(sessions.activeResourceKey);
  } catch {
    // Browser persistence is best-effort; the in-memory session remains authoritative.
  }
};
