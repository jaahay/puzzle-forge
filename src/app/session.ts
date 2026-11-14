import type { CardGeneratedPuzzle, CardStack, GeneratedPuzzle, GridGeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";
import type { GridHistoryEntry } from "./gridHistory";
import type { JigsawAssemblyProgress } from "../games/jigsaw/assembly";
import type { ImageTileActionRuntime } from "../games/imageTiles/history";
import {
  loadPersistedPuzzleSessions as loadPersistedPuzzleSessionsUnsafe,
  savePersistedPuzzleSessions as savePersistedPuzzleSessionsUnsafe,
  type PersistedPuzzleSession,
  type PersistedPuzzleSessions,
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
  jigsawAssembly?: JigsawAssemblyProgress;
  imageTileRuntime?: ImageTileActionRuntime;
};

type TileGeneratedPuzzle = Exclude<GeneratedPuzzle, CardGeneratedPuzzle | GridGeneratedPuzzle>;

export type PuzzleSession =
  | {
      kind: "cards";
      puzzle: CardGeneratedPuzzle;
      progress: CardSessionProgress;
    }
  | {
      kind: "grid";
      puzzle: GridGeneratedPuzzle;
      progress: GridSessionProgress;
    }
  | {
      kind: "tiles";
      puzzle: TileGeneratedPuzzle;
      progress: TileSessionProgress;
    };

export type PuzzleSessionCache = Partial<Record<PuzzleId, PuzzleSession>>;

const persistedSessionTimestamp = (session: PersistedPuzzleSession) => {
  const timestamp = Date.parse(session.updatedAt);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

export const getMostRecentPersistedPuzzleSession = (
  puzzleId: PuzzleId,
  persisted: PersistedPuzzleSessions | null,
): PersistedPuzzleSession | null => {
  if (!persisted) return null;

  const activeSession = persisted.sessions[persisted.activeResourceKey];
  if (activeSession?.puzzleId === puzzleId) return activeSession;

  let mostRecent: PersistedPuzzleSession | null = null;
  for (const session of Object.values(persisted.sessions)) {
    if (!session || session.puzzleId !== puzzleId) continue;
    if (!mostRecent || persistedSessionTimestamp(session) > persistedSessionTimestamp(mostRecent)) {
      mostRecent = session;
    }
  }
  return mostRecent;
};

export const loadPersistedPuzzleSessions = () => {
  try {
    return loadPersistedPuzzleSessionsUnsafe();
  } catch {
    return null;
  }
};

const retireImportedImageTileProgress = (sessions: RuntimePuzzleSessions) => {
  const session = sessions.sessions[sessions.activeResourceKey];
  if (!session || session.kind !== "tiles" || session.puzzle.puzzleId === "jigsaw" ||
      !session.progress.imageTileRuntime) return;

  // Retire the old per-type slot only after the canonical resource snapshot is
  // demonstrably stored. A failed/quota-limited write must not lose progress.
  const legacyKey = `puzzle-forge.image-tile-progress.v1.${session.puzzle.puzzleId}`;
  const legacyRaw = window.localStorage.getItem(legacyKey);
  if (!legacyRaw) return;
  const legacy: unknown = JSON.parse(legacyRaw);
  if (!legacy || typeof legacy !== "object" || !("puzzleInstanceId" in legacy) ||
      legacy.puzzleInstanceId !== session.puzzle.id) return;

  const savedRaw = window.localStorage.getItem(`puzzle-forge.session.${sessions.activeResourceKey}`);
  if (!savedRaw) return;
  const saved: unknown = JSON.parse(savedRaw);
  if (!saved || typeof saved !== "object" || !("puzzleId" in saved) ||
      !("baselineChecksum" in saved) || !("progress" in saved) ||
      saved.puzzleId !== session.puzzle.puzzleId ||
      saved.baselineChecksum !== session.puzzle.checksum) return;

  const progress = saved.progress;
  const current = session.progress.imageTileRuntime.state;
  if (!progress || typeof progress !== "object" || !("kind" in progress) ||
      !("imageTileMoveCount" in progress) || !("tileOrder" in progress) ||
      progress.kind !== "tiles" || progress.imageTileMoveCount !== current.moveCount ||
      !Array.isArray(progress.tileOrder) || progress.tileOrder.length !== current.tiles.length ||
      progress.tileOrder.some((tile: unknown, index: number) => {
        const expected = current.tiles[index];
        return !tile || typeof tile !== "object" || !("id" in tile) ||
          !("currentIndex" in tile) || tile.id !== expected.id ||
          tile.currentIndex !== expected.currentIndex;
      })) return;

  window.localStorage.removeItem(legacyKey);
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
    retireImportedImageTileProgress(sessions);
  } catch {
    // Browser persistence is best-effort; the in-memory session remains authoritative.
  }
};