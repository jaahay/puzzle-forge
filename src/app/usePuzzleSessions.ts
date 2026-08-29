import { useRef } from "preact/hooks";
import type { GeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";
import { cloneStack } from "../interactions/cardRules";
import { cloneGridCell, prepareGridCells } from "../interactions/gridRules";
import {
  initialSolitaireStats,
  restorePuzzleSessionFromPersisted,
  savePersistedPuzzleSessions,
  solitaireHistoryLimit,
  type PersistedPuzzleSessionCache,
  type PuzzleSession,
  type PuzzleSessionCache,
  type SolitaireHistoryEntry,
  type SolitaireStats,
} from "./session";
import { cloneSolitaireHistoryEntry } from "./solitaireHistory";

export type RuntimeSessionDraft = {
  puzzle: GeneratedPuzzle;
  cardStacks: PuzzleSession["cardStacks"];
  selectedCard: PuzzleSession["selectedCard"];
  solitaireStats: SolitaireStats;
  solitaireUndoStack: SolitaireHistoryEntry[];
  solitaireRedoStack: SolitaireHistoryEntry[];
  gridCells: PuzzleCell[] | null;
  selectedGridCell: PuzzleSession["selectedGridCell"];
  statusMessage: string;
};

const cloneSessionGridCell = (puzzleId: PuzzleId, cell: PuzzleCell): PuzzleCell => {
  const clonedCell = cloneGridCell(cell);
  if (puzzleId === "sudoku" && !clonedCell.locked && (clonedCell.tone === "answer" || clonedCell.tone === "hint")) {
    return { ...clonedCell, tone: "empty" };
  }
  return clonedCell;
};

const cloneGeneratedPuzzle = (puzzle: GeneratedPuzzle): GeneratedPuzzle => {
  if (puzzle.kind === "cards") {
    return { ...puzzle, stacks: puzzle.stacks.map(cloneStack), solitaireVariation: { ...puzzle.solitaireVariation } };
  }
  if (puzzle.kind === "grid") {
    return { ...puzzle, cells: puzzle.cells.map(cloneGridCell), answerKey: puzzle.answerKey ? [...puzzle.answerKey] : undefined };
  }
  if (puzzle.puzzleId === "jigsaw") {
    return {
      ...puzzle,
      tiles: puzzle.tiles.map((tile) => ({ ...tile, edges: tile.edges.map((edge) => ({ ...edge })) })),
      asset: { ...puzzle.asset, files: { ...puzzle.asset.files }, credit: { ...puzzle.asset.credit } },
      edgeModel: { ...puzzle.edgeModel, profileIds: [...puzzle.edgeModel.profileIds] },
    };
  }
  return {
    ...puzzle,
    tiles: puzzle.tiles.map((tile) => ({ ...tile })),
    asset: { ...puzzle.asset, files: { ...puzzle.asset.files }, credit: { ...puzzle.asset.credit } },
  };
};

export const clonePuzzleSession = (session: PuzzleSession): PuzzleSession => ({
  puzzle: cloneGeneratedPuzzle(session.puzzle),
  cardStacks: session.cardStacks?.map(cloneStack) ?? null,
  selectedCard: session.selectedCard ? { ...session.selectedCard } : null,
  solitaireStats: { ...session.solitaireStats },
  solitaireUndoStack: session.solitaireUndoStack.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit),
  solitaireRedoStack: session.solitaireRedoStack.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit),
  gridCells: session.gridCells?.map(cloneGridCell) ?? null,
  selectedGridCell: session.selectedGridCell ? { ...session.selectedGridCell } : null,
  statusMessage: session.statusMessage,
});

export const buildRuntimeSession = ({
  puzzle,
  cardStacks,
  selectedCard,
  solitaireStats,
  solitaireUndoStack,
  solitaireRedoStack,
  gridCells,
  selectedGridCell,
  statusMessage,
}: RuntimeSessionDraft): PuzzleSession => ({
  puzzle,
  cardStacks: cardStacks?.map(cloneStack) ?? null,
  selectedCard: selectedCard ? { ...selectedCard } : null,
  solitaireStats: { ...solitaireStats },
  solitaireUndoStack: solitaireUndoStack.map(cloneSolitaireHistoryEntry),
  solitaireRedoStack: solitaireRedoStack.map(cloneSolitaireHistoryEntry),
  gridCells: gridCells?.map((cell) => cloneSessionGridCell(puzzle.puzzleId, cell)) ?? null,
  selectedGridCell: selectedGridCell ? { ...selectedGridCell } : null,
  statusMessage,
});

export const buildFreshSessionForGeneratedPuzzle = (generatedPuzzle: GeneratedPuzzle, statusMessage: string): PuzzleSession => ({
  puzzle: generatedPuzzle,
  cardStacks: generatedPuzzle.kind === "cards" ? generatedPuzzle.stacks.map(cloneStack) : null,
  selectedCard: null,
  solitaireStats: { ...initialSolitaireStats },
  solitaireUndoStack: [],
  solitaireRedoStack: [],
  gridCells: generatedPuzzle.kind === "grid" ? prepareGridCells(generatedPuzzle) : null,
  selectedGridCell: null,
  statusMessage,
});

export const usePuzzleSessions = () => {
  const persistedSessionCache = useRef<PersistedPuzzleSessionCache>({});
  const sessionCache = useRef<PuzzleSessionCache>({});
  const pendingRestorePuzzleId = useRef<PuzzleId | null>(null);

  const saveSession = (activePuzzleId: PuzzleId, session: PuzzleSession) => {
    sessionCache.current[activePuzzleId] = clonePuzzleSession(session);
    savePersistedPuzzleSessions({ activePuzzleId, sessions: sessionCache.current });
  };

  const getCachedSession = (puzzleId: PuzzleId) => {
    const session = sessionCache.current[puzzleId];
    return session ? clonePuzzleSession(session) : null;
  };

  const initializePersistedSessions = (sessions: PersistedPuzzleSessionCache) => {
    persistedSessionCache.current = { ...sessions };
  };

  const beginPersistedRestore = (puzzleId: PuzzleId) => {
    const persistedSession = persistedSessionCache.current[puzzleId];
    if (!persistedSession) return null;
    pendingRestorePuzzleId.current = puzzleId;
    return persistedSession;
  };

  const cancelPersistedRestore = () => {
    pendingRestorePuzzleId.current = null;
  };

  const restorePendingSessionForPuzzle = (generatedPuzzle: GeneratedPuzzle) => {
    const pendingPersistedSession = pendingRestorePuzzleId.current === generatedPuzzle.puzzleId
      ? persistedSessionCache.current[generatedPuzzle.puzzleId]
      : undefined;
    const restoredSession = pendingPersistedSession
      ? restorePuzzleSessionFromPersisted(pendingPersistedSession, generatedPuzzle)
      : null;

    pendingRestorePuzzleId.current = null;
    if (!restoredSession) return null;

    sessionCache.current[generatedPuzzle.puzzleId] = clonePuzzleSession(restoredSession);
    return restoredSession;
  };

  return {
    saveSession,
    getCachedSession,
    initializePersistedSessions,
    beginPersistedRestore,
    cancelPersistedRestore,
    restorePendingSessionForPuzzle,
  };
};
