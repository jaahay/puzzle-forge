import { useRef } from "preact/hooks";
import type { GeneratedPuzzle, PuzzleCell, PuzzleDifficulty, PuzzleId } from "../catalog/types";
import { cloneStack } from "../interactions/cardRules";
import { cloneGridCell, prepareGridCells } from "../interactions/gridRules";
import {
  initialSolitaireStats,
  loadPersistedPuzzleSessions,
  restorePuzzleSessionFromPersisted,
  savePersistedPuzzleSessions,
  solitaireHistoryLimit,
  type PersistedPuzzleSessionCache,
  type PuzzleSession,
  type PuzzleSessionCache,
  type SolitaireHistoryEntry,
  type SolitaireStats,
} from "./session";

export type RuntimeSessionDraft = {
  puzzleId: PuzzleId;
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  puzzle: PuzzleSession["puzzle"];
  cardStacks: PuzzleSession["cardStacks"];
  selectedCard: PuzzleSession["selectedCard"];
  solitaireStats: SolitaireStats;
  solitaireUndoStack: SolitaireHistoryEntry[];
  solitaireRedoStack: SolitaireHistoryEntry[];
  gridCells: PuzzleCell[] | null;
  selectedGridCell: PuzzleSession["selectedGridCell"];
  statusMessage: string;
};

export type RestoreSessionCallbacks = {
  restoreSession: (puzzleId: PuzzleId, session: PuzzleSession) => void;
  beginGeneration: (session: Pick<PuzzleSession, "seed" | "width" | "height" | "difficulty" | "requireUniqueSolution" | "solitaireVariation"> & { puzzleId: PuzzleId }) => void;
};

const cloneSolitaireHistoryEntry = (entry: SolitaireHistoryEntry): SolitaireHistoryEntry => ({
  cardStacks: entry.cardStacks.map(cloneStack),
  selectedCard: entry.selectedCard ? { ...entry.selectedCard } : null,
  solitaireStats: { ...entry.solitaireStats },
  statusMessage: entry.statusMessage,
});

export const clonePuzzleSession = (session: PuzzleSession): PuzzleSession => ({
  ...session,
  solitaireVariation: session.solitaireVariation ? { ...session.solitaireVariation } : undefined,
  puzzle: session.puzzle
    ? session.puzzle.kind === "cards"
      ? { ...session.puzzle, stacks: session.puzzle.stacks.map(cloneStack), solitaireVariation: { ...session.puzzle.solitaireVariation } }
      : session.puzzle.kind === "grid"
        ? { ...session.puzzle, cells: session.puzzle.cells.map(cloneGridCell), answerKey: session.puzzle.answerKey ? [...session.puzzle.answerKey] : undefined }
        : { ...session.puzzle, tiles: session.puzzle.tiles.map((tile) => ({ ...tile })), asset: { ...session.puzzle.asset, palette: [...session.puzzle.asset.palette] } }
    : null,
  cardStacks: session.cardStacks?.map(cloneStack) ?? null,
  selectedCard: session.selectedCard ? { ...session.selectedCard } : null,
  solitaireStats: { ...session.solitaireStats },
  solitaireUndoStack: session.solitaireUndoStack?.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit) ?? [],
  solitaireRedoStack: session.solitaireRedoStack?.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit) ?? [],
  gridCells: session.gridCells?.map(cloneGridCell) ?? null,
  selectedGridCell: session.selectedGridCell ? { ...session.selectedGridCell } : null,
});

export const buildRuntimeSession = ({
  puzzleId,
  seed,
  width,
  height,
  difficulty,
  requireUniqueSolution,
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
  seed,
  width,
  height,
  difficulty,
  requireUniqueSolution,
  solitaireVariation: puzzleId === "klondike-solitaire" && puzzle?.kind === "cards" ? { ...puzzle.solitaireVariation } : undefined,
  puzzle,
  cardStacks: cardStacks?.map(cloneStack) ?? null,
  selectedCard: selectedCard ? { ...selectedCard } : null,
  solitaireStats: { ...solitaireStats },
  solitaireUndoStack: solitaireUndoStack.map(cloneSolitaireHistoryEntry),
  solitaireRedoStack: solitaireRedoStack.map(cloneSolitaireHistoryEntry),
  gridCells: gridCells?.map(cloneGridCell) ?? null,
  selectedGridCell: selectedGridCell ? { ...selectedGridCell } : null,
  statusMessage,
});

export const buildFreshSessionForGeneratedPuzzle = (
  generatedPuzzle: GeneratedPuzzle,
  statusMessage: string,
): PuzzleSession => ({
  seed: generatedPuzzle.seed,
  width: generatedPuzzle.width,
  height: generatedPuzzle.height,
  difficulty: generatedPuzzle.difficulty ?? "Easy",
  requireUniqueSolution: Boolean(generatedPuzzle.uniqueSolution),
  solitaireVariation: generatedPuzzle.kind === "cards" ? { ...generatedPuzzle.solitaireVariation } : undefined,
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
  const hasLoadedPersistedSessions = useRef(false);

  const saveSession = (activePuzzleId: PuzzleId, session: PuzzleSession) => {
    sessionCache.current[activePuzzleId] = clonePuzzleSession(session);
    savePersistedPuzzleSessions({ activePuzzleId, sessions: sessionCache.current });
  };

  const getCachedSession = (puzzleId: PuzzleId) => {
    const session = sessionCache.current[puzzleId];
    return session ? clonePuzzleSession(session) : null;
  };

  const loadPersistedSessionsOnce = ({ restoreSession, beginGeneration }: RestoreSessionCallbacks) => {
    if (hasLoadedPersistedSessions.current) {
      return;
    }

    hasLoadedPersistedSessions.current = true;
    const persisted = loadPersistedPuzzleSessions();

    if (!persisted) {
      return;
    }

    persistedSessionCache.current = persisted.sessions;
    const activePersistedSession = persisted.sessions[persisted.activePuzzleId];

    if (activePersistedSession) {
      pendingRestorePuzzleId.current = activePersistedSession.puzzleId;
      beginGeneration({
        puzzleId: activePersistedSession.puzzleId,
        seed: activePersistedSession.seed,
        width: activePersistedSession.width,
        height: activePersistedSession.height,
        difficulty: activePersistedSession.difficulty,
        requireUniqueSolution: activePersistedSession.requireUniqueSolution,
        solitaireVariation: activePersistedSession.solitaireVariation,
      });
    }
  };

  const restorePendingSessionForPuzzle = (generatedPuzzle: GeneratedPuzzle) => {
    const pendingPersistedSession =
      pendingRestorePuzzleId.current === generatedPuzzle.puzzleId ? persistedSessionCache.current[generatedPuzzle.puzzleId] : undefined;
    const restoredSession = pendingPersistedSession ? restorePuzzleSessionFromPersisted(pendingPersistedSession, generatedPuzzle) : null;

    if (!restoredSession) {
      pendingRestorePuzzleId.current = null;
      return null;
    }

    pendingRestorePuzzleId.current = null;
    sessionCache.current[generatedPuzzle.puzzleId] = clonePuzzleSession(restoredSession);
    return restoredSession;
  };

  return {
    sessionCache,
    persistedSessionCache,
    pendingRestorePuzzleId,
    saveSession,
    getCachedSession,
    loadPersistedSessionsOnce,
    restorePendingSessionForPuzzle,
    buildFreshSessionForGeneratedPuzzle,
  };
};
