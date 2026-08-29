import type { GeneratedPuzzle, PuzzleCell, PuzzleDifficulty, PuzzleId, SolitaireRedealLimit, SolitaireVariation, SudokuVariation } from "../catalog/types";
import { normalizeSolitaireVariation, solitaireRedealLimits, solitaireVariationsEqual } from "../games/solitaire/variation";
import { normalizeSudokuVariation } from "../games/sudoku/variation";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";
import {
  buildPersistedCardStack,
  buildPersistedSolitaireHistory,
  cloneCardStack,
  clonePersistedCardStack,
  isPersistedCardStack,
  restorePersistedCardStacks,
  restorePersistedSolitaireHistory,
  trimPersistedSolitaireHistory,
  type PersistedCardStack,
  type PersistedSolitaireHistoryEntry,
} from "./cardPersistence";
import { puzzleIds } from "./sessionConstants";
import type { PuzzleSession, PuzzleSessionCache, SolitaireStats } from "./session";

const persistenceSchemaVersion = 1;
const persistenceMetadataStorageKey = "puzzle-forge.sessions.v1";
const persistenceSessionStorageKeyPrefix = "puzzle-forge.session.v1.";
const puzzleDifficulties = ["Easy", "Medium", "Hard", "Expert"] as const satisfies readonly PuzzleDifficulty[];
const puzzleCellTones = ["given", "empty", "accent", "answer", "hint", "disabled"] as const satisfies readonly PuzzleCell["tone"][];

const emptySolitaireStats: SolitaireStats = {
  moveCount: 0,
  drawCount: 0,
  recycleCount: 0,
  autoMoveCount: 0,
};

export type PersistedPuzzleIdentity = {
  puzzleId: PuzzleId;
  seed: string;
  width: number;
  height: number;
  difficulty?: PuzzleDifficulty;
  requireUniqueSolution?: boolean;
  sudokuVariation?: SudokuVariation;
  solitaireVariation?: SolitaireVariation;
  imageId?: string;
  puzzleInstanceId?: string;
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
const isNonNegativeInteger = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;
const isPositiveInteger = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0;
const isPuzzleId = (value: unknown): value is PuzzleId => typeof value === "string" && puzzleIds.includes(value as PuzzleId);
const isPuzzleDifficulty = (value: unknown): value is PuzzleDifficulty =>
  typeof value === "string" && puzzleDifficulties.includes(value as PuzzleDifficulty);
const isPuzzleCellTone = (value: unknown): value is PuzzleCell["tone"] =>
  typeof value === "string" && puzzleCellTones.includes(value as PuzzleCell["tone"]);
const isSudokuVariation = (value: unknown): value is SudokuVariation => value === "classic" || value === "diagonal" || value === "zero-killer";
const isSolitaireRedealLimit = (value: unknown): value is SolitaireRedealLimit => solitaireRedealLimits.includes(value as SolitaireRedealLimit);
const isSolitaireVariation = (value: unknown): value is SolitaireVariation =>
  isRecord(value) &&
  (value.drawMode === "draw-1" || value.drawMode === "draw-3") &&
  isSolitaireRedealLimit(value.redeals) &&
  (value.wasteMode === "standard" || value.wasteMode === "relaxed") &&
  typeof value.knownSolvable === "boolean";
const isSolitaireStats = (value: unknown): value is SolitaireStats =>
  isRecord(value) &&
  isNonNegativeInteger(value.moveCount) &&
  isNonNegativeInteger(value.drawCount) &&
  isNonNegativeInteger(value.recycleCount) &&
  isNonNegativeInteger(value.autoMoveCount);
const isCardSelection = (value: unknown): value is CardSelection | null =>
  value === null || (isRecord(value) && typeof value.stackId === "string" && isNonNegativeInteger(value.cardIndex));
const isGridCellSelection = (value: unknown): value is GridCellSelection | null =>
  value === null || (isRecord(value) && isNonNegativeInteger(value.row) && isNonNegativeInteger(value.column));
const isPuzzleCell = (value: unknown): value is PuzzleCell =>
  isRecord(value) &&
  isNonNegativeInteger(value.row) &&
  isNonNegativeInteger(value.column) &&
  typeof value.value === "string" &&
  typeof value.locked === "boolean" &&
  isPuzzleCellTone(value.tone) &&
  (value.ariaLabel === undefined || typeof value.ariaLabel === "string");
const isPersistedTileOrderEntry = (value: unknown): value is PersistedTileProgress["tileOrder"][number] =>
  isRecord(value) && typeof value.id === "string" && isNonNegativeInteger(value.currentIndex);
const isPersistedSolitaireHistoryEntry = (value: unknown): value is PersistedSolitaireHistoryEntry =>
  isRecord(value) &&
  Array.isArray(value.cardStacks) &&
  value.cardStacks.every(isPersistedCardStack) &&
  isCardSelection(value.selectedCard) &&
  isSolitaireStats(value.solitaireStats) &&
  typeof value.statusMessage === "string";

const cloneGridCell = (cell: PuzzleCell): PuzzleCell => ({ ...cell });

const buildPersistedPuzzleIdentity = (puzzle: GeneratedPuzzle): PersistedPuzzleIdentity => {
  const sudokuVariation = puzzle.puzzleId === "sudoku" ? normalizeSudokuVariation(puzzle.sudokuVariation) : undefined;
  const solitaireVariation = puzzle.kind === "cards" ? normalizeSolitaireVariation(puzzle.solitaireVariation) : undefined;
  const imageId = puzzle.kind === "tiles" ? puzzle.asset.id : undefined;
  const puzzleInstanceId = puzzle.kind === "tiles" ? puzzle.id : undefined;

  return {
    puzzleId: puzzle.puzzleId,
    seed: puzzle.seed,
    width: puzzle.width,
    height: puzzle.height,
    ...(puzzle.difficulty ? { difficulty: puzzle.difficulty } : {}),
    ...(puzzle.uniqueSolution !== undefined ? { requireUniqueSolution: Boolean(puzzle.uniqueSolution) } : {}),
    ...(sudokuVariation ? { sudokuVariation } : {}),
    ...(solitaireVariation ? { solitaireVariation } : {}),
    ...(imageId ? { imageId } : {}),
    ...(puzzleInstanceId ? { puzzleInstanceId } : {}),
    generatorVersion: 1,
  };
};

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

  if (session.puzzle.kind === "tiles") {
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
  if (session.puzzle.puzzleId !== puzzleId) return null;
  const progress = buildPersistedPuzzleProgress(session);
  if (!progress) return null;

  return {
    ...buildPersistedPuzzleIdentity(session.puzzle),
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
  value.stacks.every(isPersistedCardStack) &&
  isCardSelection(value.selectedCard) &&
  isSolitaireStats(value.stats) &&
  Array.isArray(value.undoStack) &&
  value.undoStack.every(isPersistedSolitaireHistoryEntry) &&
  Array.isArray(value.redoStack) &&
  value.redoStack.every(isPersistedSolitaireHistoryEntry);

const isPersistedTileProgress = (value: Record<string, unknown>): value is PersistedTileProgress =>
  Array.isArray(value.tileOrder) &&
  value.tileOrder.every(isPersistedTileOrderEntry) &&
  (value.selectedTileId === null || typeof value.selectedTileId === "string");

const isPersistedGridProgress = (value: Record<string, unknown>): value is PersistedGridProgress =>
  Array.isArray(value.cells) && value.cells.every(isPuzzleCell) && isGridCellSelection(value.selectedCell);

const isPersistedPuzzleProgress = (value: unknown): value is PersistedPuzzleProgress => {
  if (!isRecord(value)) return false;
  if (value.kind === "cards") return isPersistedCardProgress(value);
  if (value.kind === "tiles") return isPersistedTileProgress(value);
  return value.kind === "grid" && isPersistedGridProgress(value);
};

const isPersistedPuzzleSession = (value: unknown): value is PersistedPuzzleSession =>
  isRecord(value) &&
  !("puzzle" in value) &&
  isPuzzleId(value.puzzleId) &&
  typeof value.seed === "string" &&
  isPositiveInteger(value.width) &&
  isPositiveInteger(value.height) &&
  (value.difficulty === undefined || isPuzzleDifficulty(value.difficulty)) &&
  (value.requireUniqueSolution === undefined || typeof value.requireUniqueSolution === "boolean") &&
  (value.sudokuVariation === undefined || isSudokuVariation(value.sudokuVariation)) &&
  (value.solitaireVariation === undefined || isSolitaireVariation(value.solitaireVariation)) &&
  (value.imageId === undefined || typeof value.imageId === "string") &&
  (value.puzzleInstanceId === undefined || typeof value.puzzleInstanceId === "string") &&
  value.generatorVersion === 1 &&
  value.progressVersion === 1 &&
  typeof value.statusMessage === "string" &&
  typeof value.updatedAt === "string" &&
  (value.completedAt === undefined || typeof value.completedAt === "string") &&
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
    return {
      kind: "tiles",
      tileOrder: progress.tileOrder.map(({ id, currentIndex }) => ({ id, currentIndex })),
      selectedTileId: progress.selectedTileId ?? null,
    };
  }

  return {
    kind: "grid",
    cells: progress.cells.map(cloneGridCell),
    selectedCell: progress.selectedCell ? { ...progress.selectedCell } : null,
  };
};

export const clonePersistedPuzzleSession = (session: PersistedPuzzleSession): PersistedPuzzleSession => ({
  ...session,
  sudokuVariation: session.sudokuVariation ? normalizeSudokuVariation(session.sudokuVariation) : undefined,
  solitaireVariation: session.solitaireVariation ? normalizeSolitaireVariation(session.solitaireVariation) : undefined,
  progress: clonePersistedPuzzleProgress(session.progress),
});

const persistedIdentityMatchesPuzzle = (persisted: PersistedPuzzleSession, puzzle: GeneratedPuzzle) =>
  persisted.puzzleId === puzzle.puzzleId &&
  persisted.seed === puzzle.seed &&
  persisted.width === puzzle.width &&
  persisted.height === puzzle.height &&
  (puzzle.difficulty === undefined || persisted.difficulty === puzzle.difficulty) &&
  (puzzle.uniqueSolution === undefined || persisted.requireUniqueSolution === Boolean(puzzle.uniqueSolution)) &&
  (puzzle.puzzleId !== "sudoku" || normalizeSudokuVariation(persisted.sudokuVariation) === normalizeSudokuVariation(puzzle.sudokuVariation)) &&
  (puzzle.kind !== "cards" || solitaireVariationsEqual(persisted.solitaireVariation, puzzle.solitaireVariation)) &&
  (puzzle.kind !== "tiles" || persisted.puzzleInstanceId === puzzle.id) &&
  (puzzle.kind !== "tiles" || persisted.imageId === puzzle.asset.id);

export const restorePuzzleSessionFromPersisted = (persisted: PersistedPuzzleSession, puzzle: GeneratedPuzzle): PuzzleSession | null => {
  if (!persistedIdentityMatchesPuzzle(persisted, puzzle)) return null;

  if (persisted.progress.kind === "cards" && puzzle.kind === "cards") {
    const stacks = restorePersistedCardStacks(persisted.progress.stacks, puzzle.stacks);
    const undoStack = restorePersistedSolitaireHistory(persisted.progress.undoStack, puzzle.stacks);
    const redoStack = restorePersistedSolitaireHistory(persisted.progress.redoStack, puzzle.stacks);

    if (!stacks || !undoStack || !redoStack) return null;

    return {
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
    if (tileIndexes.size !== puzzle.tiles.length || puzzle.tiles.some((tile) => !tileIndexes.has(tile.id))) return null;

    const restoreTileOrder = <T extends { id: string; currentIndex: number }>(tiles: T[]) =>
      tiles.map((tile) => ({ ...tile, currentIndex: tileIndexes.get(tile.id) ?? tile.currentIndex }));

    const restoredPuzzle: GeneratedPuzzle = puzzle.puzzleId === "jigsaw"
      ? { ...puzzle, tiles: restoreTileOrder(puzzle.tiles) }
      : puzzle.puzzleId === "sliding-puzzle"
        ? { ...puzzle, tiles: restoreTileOrder(puzzle.tiles) }
        : { ...puzzle, tiles: restoreTileOrder(puzzle.tiles) };

    return {
      puzzle: restoredPuzzle,
      cardStacks: null,
      selectedCard: null,
      solitaireStats: emptySolitaireStats,
      solitaireUndoStack: [],
      solitaireRedoStack: [],
      gridCells: null,
      selectedGridCell: null,
      statusMessage: persisted.statusMessage,
    };
  }

  if (persisted.progress.kind === "grid" && puzzle.kind === "grid") {
    return {
      puzzle,
      cardStacks: null,
      selectedCard: null,
      solitaireStats: emptySolitaireStats,
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

const readPersistedMetadata = (): PersistedPuzzleSessionMetadata | null => {
  const rawMetadata = window.localStorage.getItem(persistenceMetadataStorageKey);
  if (!rawMetadata) return null;

  try {
    const metadata: unknown = JSON.parse(rawMetadata);
    return isPersistedPuzzleSessionMetadata(metadata) ? metadata : null;
  } catch {
    return null;
  }
};

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

  const metadata = readPersistedMetadata();
  if (!metadata) return null;

  const sessions: PersistedPuzzleSessionCache = {};
  for (const puzzleId of metadata.savedPuzzleIds) {
    const session = readPersistedSession(puzzleId);
    if (session) sessions[puzzleId] = session;
  }

  if (!sessions[metadata.activePuzzleId]) return null;
  return { activePuzzleId: metadata.activePuzzleId, sessions };
};

export const savePersistedPuzzleSessions = ({ activePuzzleId, sessions }: RuntimePuzzleSessions) => {
  if (typeof window === "undefined") return;

  const previousSavedPuzzleIds = readPersistedMetadata()?.savedPuzzleIds ?? [];
  const savedPuzzleIds = new Set(previousSavedPuzzleIds);
  const activeSession = sessions[activePuzzleId];
  const persistedActiveSession = activeSession ? buildPersistedPuzzleSession(activePuzzleId, activeSession) : null;

  if (persistedActiveSession) {
    savedPuzzleIds.add(activePuzzleId);
    window.localStorage.setItem(sessionStorageKey(activePuzzleId), JSON.stringify(persistedActiveSession));
  } else {
    savedPuzzleIds.delete(activePuzzleId);
    window.localStorage.removeItem(sessionStorageKey(activePuzzleId));
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
  for (const puzzleId of puzzleIds) window.localStorage.removeItem(sessionStorageKey(puzzleId));
};
