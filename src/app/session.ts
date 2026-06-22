import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDifficulty, PuzzleId } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";

const persistenceSchemaVersion = 1;
const persistenceStorageKey = "puzzle-forge.sessions.v1";

export const solitaireHistoryLimit = 120;
export const solitaireHistoryLimitNotice = `Undo history is saved on this device for your most recent ${solitaireHistoryLimit} Solitaire steps.`;

const puzzleIds: readonly PuzzleId[] = [
  "sudoku",
  "nonogram",
  "word-guess",
  "logic-grid",
  "klondike-solitaire",
  "peg-solitaire",
  "kenken",
  "minesweeper",
  "jigsaw",
  "slitherlink",
];

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

export type PuzzleSession = {
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  puzzle: GeneratedPuzzle | null;
  cardStacks: CardStack[] | null;
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  solitaireUndoStack?: SolitaireHistoryEntry[];
  solitaireRedoStack?: SolitaireHistoryEntry[];
  gridCells: PuzzleCell[] | null;
  selectedGridCell: GridCellSelection | null;
  statusMessage: string;
};

export type PuzzleSessionCache = Partial<Record<PuzzleId, PuzzleSession>>;

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
  stacks: CardStack[];
  selectedCard: CardSelection | null;
  stats: SolitaireStats;
  undoStack: SolitaireHistoryEntry[];
  redoStack: SolitaireHistoryEntry[];
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

type PersistedPuzzleSessionEnvelope = PersistedPuzzleSessions & {
  schemaVersion: typeof persistenceSchemaVersion;
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isPuzzleId = (value: unknown): value is PuzzleId => typeof value === "string" && puzzleIds.includes(value as PuzzleId);
const isSolitaireStats = (value: unknown): value is SolitaireStats =>
  isRecord(value) && typeof value.moveCount === "number" && typeof value.drawCount === "number" && typeof value.recycleCount === "number" && typeof value.autoMoveCount === "number";

const cloneGridCell = (cell: PuzzleCell): PuzzleCell => ({ ...cell });
const cloneCardStack = (stack: CardStack): CardStack => ({ ...stack, cards: stack.cards.map((card) => ({ ...card })) });
const cloneSolitaireHistoryEntry = (entry: SolitaireHistoryEntry): SolitaireHistoryEntry => ({
  cardStacks: entry.cardStacks.map(cloneCardStack),
  selectedCard: entry.selectedCard ? { ...entry.selectedCard } : null,
  solitaireStats: { ...entry.solitaireStats },
  statusMessage: entry.statusMessage,
});
const trimSolitaireHistory = (entries: SolitaireHistoryEntry[] = []) => entries.slice(-solitaireHistoryLimit).map(cloneSolitaireHistoryEntry);

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
      stacks: session.cardStacks.map(cloneCardStack),
      selectedCard: session.selectedCard ? { ...session.selectedCard } : null,
      stats: { ...session.solitaireStats },
      undoStack: trimSolitaireHistory(session.solitaireUndoStack),
      redoStack: trimSolitaireHistory(session.solitaireRedoStack),
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

const isPersistedPuzzleProgress = (value: unknown): value is PersistedPuzzleProgress => {
  if (!isRecord(value)) return false;
  if (value.kind === "cards") return Array.isArray(value.stacks) && isSolitaireStats(value.stats) && Array.isArray(value.undoStack) && Array.isArray(value.redoStack);
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

const clonePersistedPuzzleProgress = (progress: PersistedPuzzleProgress): PersistedPuzzleProgress => {
  if (progress.kind === "cards") {
    return {
      kind: "cards",
      stacks: progress.stacks.map(cloneCardStack),
      selectedCard: progress.selectedCard ? { ...progress.selectedCard } : null,
      stats: { ...progress.stats },
      undoStack: trimSolitaireHistory(progress.undoStack),
      redoStack: trimSolitaireHistory(progress.redoStack),
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
    const stacks = persisted.progress.stacks.map(cloneCardStack);

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
      solitaireUndoStack: trimSolitaireHistory(persisted.progress.undoStack),
      solitaireRedoStack: trimSolitaireHistory(persisted.progress.redoStack),
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

export const loadPersistedPuzzleSessions = (): PersistedPuzzleSessions | null => {
  if (typeof window === "undefined") return null;

  const rawEnvelope = window.localStorage.getItem(persistenceStorageKey);
  if (!rawEnvelope) return null;

  try {
    const envelope: unknown = JSON.parse(rawEnvelope);
    if (!isRecord(envelope) || envelope.schemaVersion !== persistenceSchemaVersion || !isPuzzleId(envelope.activePuzzleId) || !isRecord(envelope.sessions)) return null;

    const sessions: PersistedPuzzleSessionCache = {};
    for (const puzzleId of puzzleIds) {
      const candidate = envelope.sessions[puzzleId];
      if (isPersistedPuzzleSession(candidate) && candidate.puzzleId === puzzleId) {
        sessions[puzzleId] = clonePersistedPuzzleSession(candidate);
      }
    }

    if (!sessions[envelope.activePuzzleId]) return null;

    return { activePuzzleId: envelope.activePuzzleId, sessions };
  } catch {
    return null;
  }
};

export const savePersistedPuzzleSessions = ({ activePuzzleId, sessions }: RuntimePuzzleSessions) => {
  if (typeof window === "undefined") return;

  const persistedSessions: PersistedPuzzleSessionCache = {};
  for (const puzzleId of puzzleIds) {
    const session = sessions[puzzleId];
    const persistedSession = session ? buildPersistedPuzzleSession(puzzleId, session) : null;
    if (persistedSession) persistedSessions[puzzleId] = persistedSession;
  }

  const envelope: PersistedPuzzleSessionEnvelope = {
    schemaVersion: persistenceSchemaVersion,
    activePuzzleId,
    sessions: persistedSessions,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(persistenceStorageKey, JSON.stringify(envelope));
};

export const clearPersistedPuzzleSessions = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(persistenceStorageKey);
};
