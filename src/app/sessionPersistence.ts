import type { GeneratedPuzzle, PuzzleCell, PuzzleDifficulty, PuzzleId } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";
import {
  buildPersistedCardStack,
  buildPersistedSolitaireHistory,
  cloneCardStack,
  clonePersistedCardStack,
  restorePersistedCardStacks,
  restorePersistedSolitaireHistory,
  trimPersistedSolitaireHistory,
  type PersistedCardStack,
  type PersistedSolitaireHistoryEntry,
} from "./cardPersistence";
import { puzzleIds } from "./sessionConstants";
import { initialSolitaireStats, type PuzzleSession, type PuzzleSessionCache, type SolitaireStats } from "./session";

const persistenceSchemaVersion = 1;
const persistenceMetadataStorageKey = "puzzle-forge.sessions.v1";
const persistenceSessionStorageKeyPrefix = "puzzle-forge.session.v1.";

export type PersistedPuzzleIdentity = {
  puzzleId: PuzzleId;
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  generatorVersion: 1;
};

export type PersistedCardProgress = {
  kind: "cards";
  stacks: PersistedCardStack[];
  selectedCard: CardSelection | null;
  stats: SolitaireStats;
  undoStack: PersistedSolitaireHistoryEntry[];
  redoStack: PersistedSolitaireHistoryEntry[];
};

export type PersistedTileProgress = {
  kind: "tiles";
  tileOrder: Array<{ id: string; currentIndex: number }>;
  selectedTileId: string | null;
};

export type PersistedGridProgress = {
  kind: "grid";
  cells: PuzzleCell[];
  selectedCell: GridCellSelection | null;
};

export type PersistedPuzzleProgress = PersistedCardProgress | PersistedTileProgress | PersistedGridProgress;

export type PersistedPuzzleSession = PersistedPuzzleIdentity & {
  progressVersion: 1;
  progress: PersistedPuzzleProgress;
  statusMessage: string;
  updatedAt: string;
  completedAt?: string;
};

export type PersistedPuzzleSessionCache = Partial<Record<PuzzleId, PersistedPuzzleSession>>;

export type RuntimePuzzleSessions = {
  activePuzzleId: PuzzleId;
  sessions: PuzzleSessionCache;
};

export type PersistedPuzzleSessions = {
  activePuzzleId: PuzzleId;
  sessions: PersistedPuzzleSessionCache;
};

type PersistedPuzzleSessionMetadata = {
  schemaVersion: typeof persistenceSchemaVersion;
  activePuzzleId: PuzzleId;
  savedPuzzleIds: PuzzleId[];
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isPuzzleId = (value: unknown): value is PuzzleId => typeof value === "string" && puzzleIds.includes(value as PuzzleId);
const isSolitaireStats = (value: unknown): value is SolitaireStats =>
  isRecord(value) && typeof value.moveCount === "number" && typeof value.drawCount === "number" && typeof value.recycleCount === "number" && typeof value.autoMoveCount === "number";
const isCardSelection = (value: unknown): value is CardSelection | null =>
  value === null || (isRecord(value) && typeof value.stackId === "string" && typeof value.cardIndex === "number");
const isPersistedSolitaireHistoryEntry = (value: unknown): value is PersistedSolitaireHistoryEntry => {
  const candidate = value as { cardStacks?: unknown; selectedCard?: unknown; solitaireStats?: unknown; statusMessage?: unknown };
  return (
    isRecord(candidate) &&
    Array.isArray(candidate.cardStacks) &&
    candidate.cardStacks.every((stack) => isRecord(stack) && typeof stack.id === "string" && Array.isArray(stack.cards)) &&
    isCardSelection(candidate.selectedCard) &&
    isSolitaireStats(candidate.solitaireStats) &&
    typeof candidate.statusMessage === "string"
  );
};

const cloneGridCell = (cell: PuzzleCell): PuzzleCell => ({ ...cell });

export const buildPersistedPuzzleIdentity = (puzzleId: PuzzleId, session: PuzzleSession): PersistedPuzzleIdentity => ({
  puzzleId,
  seed: session.seed,
  width: session.width,
  height: session.height,
  difficulty: session.difficulty,
  requireUniqueSolution: session.requireUniqueSolution,
  generatorVersion: 1,
});

const buildPersistedPuzzleProgress = (session: PuzzleSession): PersistedPuzzleProgress | null => {
  if (session.cardStacks) {
    return {
      kind: "cards",
      stacks: session.cardStacks.map(buildPersistedCardStack),
      selectedCard: session.selectedCard ? { ...session.selectedCard } : null,
      stats: { ...session.solitaireStats },
      undoStack: buildPersistedSolitaireHistory(session.solitaireUndoStack),
      redoStack: buildPersistedSolitaireHistory(session.solitaireRedoStack),
    };
  }

  if (session.puzzle?.kind === "tiles") {
    return {
      kind: "tiles",
      tileOrder: session.puzzle.tiles.map(({ id, currentIndex }) => ({ id, currentIndex })),
      selectedTileId: null,
    };
  }

  if (session.gridCells) {
    return {
      kind: "grid",
      cells: session.gridCells.map(cloneGridCell),
      selectedCell: session.selectedGridCell ? { ...session.selectedGridCell } : null,
    };
  }

  return null;
};

export const buildPersistedPuzzleSession = (puzzleId: PuzzleId, session: PuzzleSession): PersistedPuzzleSession | null => {
  const progress = buildPersistedPuzzleProgress(session);
  if (!progress) return null;

  return {
    ...buildPersistedPuzzleIdentity(puzzleId, session),
    progressVersion: 1,
    progress,
    statusMessage: session.statusMessage,
    updatedAt: new Date().toISOString(),
  };
};

export const completePersistedPuzzleSession = (session: PersistedPuzzleSession, completedAt = new Date().toISOString()): PersistedPuzzleSession => ({
  ...session,
  completedAt,
  progress:
    session.progress.kind === "cards"
      ? { ...session.progress, undoStack: [], redoStack: [], selectedCard: null }
      : session.progress,
  updatedAt: completedAt,
});

const isPersistedCardProgress = (value: Record<string, unknown>): value is PersistedCardProgress =>
  Array.isArray(value.stacks) &&
  value.stacks.every((stack) => isRecord(stack) && typeof stack.id === "string" && Array.isArray(stack.cards)) &&
  isCardSelection(value.selectedCard) &&
  isSolitaireStats(value.stats) &&
  Array.isArray(value.undoStack) &&
  value.undoStack.every(isPersistedSolitaireHistoryEntry) &&
  Array.isArray(value.redoStack) &&
  value.redoStack.every(isPersistedSolitaireHistoryEntry);

const isPersistedPuzzleProgress = (value: unknown): value is PersistedPuzzleProgress => {
  if (!isRecord(value)) return false;
  if (value.kind === "cards") return isPersistedCardProgress(value);
  if (value.kind === "tiles") return Array.isArray(value.tileOrder);
  return value.kind === "grid" && Array.isArray(value.cells);
};

const isPersistedPuzzleSession = (value: unknown): value is PersistedPuzzleSession =>
  isRecord(value) &&
  !("puzzle" in value) &&
  isPuzzleId(value.puzzleId) &&
  typeof value.seed === "string" &&
  typeof value.width === "number" &&
  typeof value.height === "number" &&
  typeof value.difficulty === "string" &&
  typeof value.requireUniqueSolution === "boolean" &&
  value.generatorVersion === 1 &&
  value.progressVersion === 1 &&
  typeof value.statusMessage === "string" &&
  typeof value.updatedAt === "string" &&
  isPersistedPuzzleProgress(value.progress);

const isPersistedPuzzleSessionMetadata = (value: unknown): value is PersistedPuzzleSessionMetadata =>
  isRecord(value) &&
  value.schemaVersion === persistenceSchemaVersion &&
  isPuzzleId(value.activePuzzleId) &&
  Array.isArray(value.savedPuzzleIds) &&
  value.savedPuzzleIds.every(isPuzzleId) &&
  typeof value.updatedAt === "string";

const clonePersistedPuzzleProgress = (progress: PersistedPuzzleProgress): PersistedPuzzleProgress => {
  if (progress.kind === "cards") {
    return {
      kind: "cards",
      stacks: progress.stacks.map(clonePersistedCardStack),
      selectedCard: progress.selectedCard ? { ...progress.selectedCard } : null,
      stats: { ...progress.stats },
      undoStack: trimPersistedSolitaireHistory(progress.undoStack),
      redoStack: trimPersistedSolitaireHistory(progress.redoStack),
    };
  }

  if (progress.kind === "tiles") {
    return { kind: "tiles", tileOrder: progress.tileOrder.map(({ id, currentIndex }) => ({ id, currentIndex })), selectedTileId: progress.selectedTileId ?? null };
  }

  return { kind: "grid", cells: progress.cells.map(cloneGridCell), selectedCell: progress.selectedCell ? { ...progress.selectedCell } : null };
};

export const clonePersistedPuzzleSession = (session: PersistedPuzzleSession): PersistedPuzzleSession => ({
  ...session,
  progress: clonePersistedPuzzleProgress(session.progress),
});

const persistedIdentityMatchesPuzzle = (persisted: PersistedPuzzleSession, puzzle: GeneratedPuzzle) =>
  persisted.puzzleId === puzzle.puzzleId &&
  persisted.seed === puzzle.seed &&
  persisted.width === puzzle.width &&
  persisted.height === puzzle.height &&
  (!puzzle.difficulty || persisted.difficulty === puzzle.difficulty);

export const restorePuzzleSessionFromPersisted = (persisted: PersistedPuzzleSession, puzzle: GeneratedPuzzle): PuzzleSession | null => {
  if (!persistedIdentityMatchesPuzzle(persisted, puzzle)) {
    return null;
  }

  if (persisted.progress.kind === "cards" && puzzle.kind === "cards") {
    const stacks = restorePersistedCardStacks(persisted.progress.stacks, puzzle.stacks);
    const undoStack = restorePersistedSolitaireHistory(persisted.progress.undoStack, puzzle.stacks);
    const redoStack = restorePersistedSolitaireHistory(persisted.progress.redoStack, puzzle.stacks);

    if (!stacks || !undoStack || !redoStack) return null;

    return {
      seed: persisted.seed,
      width: persisted.width,
      height: persisted.height,
      difficulty: persisted.difficulty,
      requireUniqueSolution: persisted.requireUniqueSolution,
      puzzle: { ...puzzle, stacks: stacks.map(cloneCardStack) },
      cardStacks: stacks,
      selectedCard: persisted.progress.selectedCard ? { ...persisted.progress.selectedCard } : null,
      solitaireStats: { ...persisted.progress.stats },
      solitaireUndoStack: undoStack,
      solitaireRedoStack: redoStack,
      gridCells: null,
      selectedGridCell: null,
      statusMessage: persisted.statusMessage,
    };
  }

  if (persisted.progress.kind === "tiles" && puzzle.kind === "tiles") {
    const tileIndexes = new Map(persisted.progress.tileOrder.map(({ id, currentIndex }) => [id, currentIndex] as const));

    if (tileIndexes.size !== puzzle.tiles.length || puzzle.tiles.some((tile) => !tileIndexes.has(tile.id))) {
      return null;
    }

    const restoredPuzzle: GeneratedPuzzle = {
      ...puzzle,
      tiles: puzzle.tiles.map((tile) => ({ ...tile, currentIndex: tileIndexes.get(tile.id) ?? tile.currentIndex })),
    };

    return {
      seed: persisted.seed,
      width: persisted.width,
      height: persisted.height,
      difficulty: persisted.difficulty,
      requireUniqueSolution: persisted.requireUniqueSolution,
      puzzle: restoredPuzzle,
      cardStacks: null,
      selectedCard: null,
      solitaireStats: initialSolitaireStats,
      solitaireUndoStack: [],
      solitaireRedoStack: [],
      gridCells: null,
      selectedGridCell: null,
      statusMessage: persisted.statusMessage,
    };
  }

  if (persisted.progress.kind === "grid" && puzzle.kind === "grid") {
    return {
      seed: persisted.seed,
      width: persisted.width,
      height: persisted.height,
      difficulty: persisted.difficulty,
      requireUniqueSolution: persisted.requireUniqueSolution,
      puzzle,
      cardStacks: null,
      selectedCard: null,
      solitaireStats: initialSolitaireStats,
      solitaireUndoStack: [],
      solitaireRedoStack: [],
      gridCells: persisted.progress.cells.map(cloneGridCell),
      selectedGridCell: persisted.progress.selectedCell ? { ...persisted.progress.selectedCell } : null,
      statusMessage: persisted.statusMessage,
    };
  }

  return null;
};

const sessionStorageKey = (puzzleId: PuzzleId) => `${persistenceSessionStorageKeyPrefix}${puzzleId}`;

const readPersistedSession = (puzzleId: PuzzleId): PersistedPuzzleSession | null => {
  const rawSession = window.localStorage.getItem(sessionStorageKey(puzzleId));
  if (!rawSession) return null;

  try {
    const session: unknown = JSON.parse(rawSession);
    return isPersistedPuzzleSession(session) && session.puzzleId === puzzleId ? clonePersistedPuzzleSession(session) : null;
  } catch {
    return null;
  }
};

export const loadPersistedPuzzleSessions = (): PersistedPuzzleSessions | null => {
  if (typeof window === "undefined") return null;

  const rawMetadata = window.localStorage.getItem(persistenceMetadataStorageKey);
  if (!rawMetadata) return null;

  try {
    const metadata: unknown = JSON.parse(rawMetadata);
    if (!isPersistedPuzzleSessionMetadata(metadata)) return null;

    const sessions: PersistedPuzzleSessionCache = {};
    for (const puzzleId of metadata.savedPuzzleIds) {
      const session = readPersistedSession(puzzleId);
      if (session) sessions[puzzleId] = session;
    }

    if (!sessions[metadata.activePuzzleId]) return null;

    return { activePuzzleId: metadata.activePuzzleId, sessions };
  } catch {
    return null;
  }
};

export const savePersistedPuzzleSessions = ({ activePuzzleId, sessions }: RuntimePuzzleSessions) => {
  if (typeof window === "undefined") return;

  const savedPuzzleIds = new Set<PuzzleId>();
  for (const puzzleId of puzzleIds) {
    const session = sessions[puzzleId];
    const persistedSession = session ? buildPersistedPuzzleSession(puzzleId, session) : null;
    if (!persistedSession) {
      window.localStorage.removeItem(sessionStorageKey(puzzleId));
      continue;
    }

    savedPuzzleIds.add(puzzleId);
    window.localStorage.setItem(sessionStorageKey(puzzleId), JSON.stringify(persistedSession));
  }

  const metadata: PersistedPuzzleSessionMetadata = {
    schemaVersion: persistenceSchemaVersion,
    activePuzzleId,
    savedPuzzleIds: [...savedPuzzleIds],
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(persistenceMetadataStorageKey, JSON.stringify(metadata));
};

export const clearPersistedPuzzleSessions = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(persistenceMetadataStorageKey);
  for (const puzzleId of puzzleIds) {
    window.localStorage.removeItem(sessionStorageKey(puzzleId));
  }
};
