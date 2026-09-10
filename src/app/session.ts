import type { CardGeneratedPuzzle, CardStack, GeneratedPuzzle, GridGeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";
import type { GridHistoryEntry } from "./gridHistory";
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
  undoStack?: GridHistoryEntry[];
  redoStack?: GridHistoryEntry[];
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

const isStorageQuotaError = (error: unknown) => {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { name?: unknown; code?: unknown };
  return candidate.name === "QuotaExceededError" ||
    candidate.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    candidate.code === 22 ||
    candidate.code === 1014;
};

const compactActiveSessionHistory = (sessions: RuntimePuzzleSessions): RuntimePuzzleSessions => {
  const activeSession = sessions.sessions[sessions.activePuzzleId];
  if (!activeSession || activeSession.kind === "tiles") return sessions;

  if (activeSession.kind === "cards") {
    return {
      activePuzzleId: sessions.activePuzzleId,
      sessions: {
        ...sessions.sessions,
        [sessions.activePuzzleId]: {
          ...activeSession,
          progress: { ...activeSession.progress, undoStack: [], redoStack: [] },
        },
      },
    };
  }

  return {
    activePuzzleId: sessions.activePuzzleId,
    sessions: {
      ...sessions.sessions,
      [sessions.activePuzzleId]: {
        ...activeSession,
        progress: { ...activeSession.progress, undoStack: [], redoStack: [] },
      },
    },
  };
};

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
  } catch (error) {
    if (!isStorageQuotaError(error)) return;

    // A deep undo/redo stack must never make the current board itself
    // unsaveable. Under browser storage pressure, retain current progress and
    // sacrifice only durable history; in-memory history remains available for
    // the rest of the active session.
    const compactSessions = compactActiveSessionHistory(sessions);
    if (compactSessions === sessions) return;

    try {
      savePersistedPuzzleSessionsUnsafe(compactSessions);
    } catch {
      // Persistence is optional. Keep the in-memory game usable when storage is unavailable.
    }
  }
};
