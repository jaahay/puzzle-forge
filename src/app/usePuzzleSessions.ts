import { useRef } from "preact/hooks";
import type { CardGeneratedPuzzle, CardStack, GeneratedPuzzle, GridGeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";
import { cloneStack, type CardSelection } from "../interactions/cardRules";
import { cloneGridCell, prepareGridCells, type GridCellSelection } from "../interactions/gridRules";
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
  cardStacks: CardStack[] | null;
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  solitaireUndoStack: SolitaireHistoryEntry[];
  solitaireRedoStack: SolitaireHistoryEntry[];
  gridCells: PuzzleCell[] | null;
  selectedGridCell: GridCellSelection | null;
  statusMessage: string;
};

const cloneSessionGridCell = (puzzleId: PuzzleId, cell: PuzzleCell): PuzzleCell => {
  const clonedCell = cloneGridCell(cell);
  if (puzzleId === "sudoku" && !clonedCell.locked && (clonedCell.tone === "answer" || clonedCell.tone === "hint")) {
    return { ...clonedCell, tone: "empty" };
  }
  return clonedCell;
};

const cloneCardPuzzle = (puzzle: CardGeneratedPuzzle): CardGeneratedPuzzle => ({
  ...puzzle,
  stacks: puzzle.stacks.map(cloneStack),
  solitaireVariation: { ...puzzle.solitaireVariation },
});

const cloneGridPuzzle = (puzzle: GridGeneratedPuzzle): GridGeneratedPuzzle => ({
  ...puzzle,
  cells: puzzle.cells.map(cloneGridCell),
  answerKey: puzzle.answerKey ? [...puzzle.answerKey] : undefined,
});

const cloneTilePuzzle = (puzzle: Exclude<GeneratedPuzzle, CardGeneratedPuzzle | GridGeneratedPuzzle>) => {
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

export const clonePuzzleSession = (session: PuzzleSession): PuzzleSession => {
  if (session.progress.kind === "cards") {
    return {
      puzzle: cloneCardPuzzle(session.puzzle),
      progress: {
        kind: "cards",
        cardStacks: session.progress.cardStacks.map(cloneStack),
        selectedCard: session.progress.selectedCard ? { ...session.progress.selectedCard } : null,
        solitaireStats: { ...session.progress.solitaireStats },
        undoStack: session.progress.undoStack.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit),
        redoStack: session.progress.redoStack.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit),
      },
      statusMessage: session.statusMessage,
    };
  }

  if (session.progress.kind === "grid") {
    return {
      puzzle: cloneGridPuzzle(session.puzzle),
      progress: {
        kind: "grid",
        cells: session.progress.cells.map(cloneGridCell),
        selectedCell: session.progress.selectedCell ? { ...session.progress.selectedCell } : null,
      },
      statusMessage: session.statusMessage,
    };
  }

  return {
    puzzle: cloneTilePuzzle(session.puzzle),
    progress: { kind: "tiles" },
    statusMessage: session.statusMessage,
  };
};

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
}: RuntimeSessionDraft): PuzzleSession => {
  if (puzzle.kind === "cards") {
    return {
      puzzle,
      progress: {
        kind: "cards",
        cardStacks: (cardStacks ?? puzzle.stacks).map(cloneStack),
        selectedCard: selectedCard ? { ...selectedCard } : null,
        solitaireStats: { ...solitaireStats },
        undoStack: solitaireUndoStack.map(cloneSolitaireHistoryEntry),
        redoStack: solitaireRedoStack.map(cloneSolitaireHistoryEntry),
      },
      statusMessage,
    };
  }

  if (puzzle.kind === "grid") {
    return {
      puzzle,
      progress: {
        kind: "grid",
        cells: (gridCells ?? prepareGridCells(puzzle)).map((cell) => cloneSessionGridCell(puzzle.puzzleId, cell)),
        selectedCell: selectedGridCell ? { ...selectedGridCell } : null,
      },
      statusMessage,
    };
  }

  return {
    puzzle,
    progress: { kind: "tiles" },
    statusMessage,
  };
};

export const buildFreshSessionForGeneratedPuzzle = (generatedPuzzle: GeneratedPuzzle, statusMessage: string): PuzzleSession => {
  if (generatedPuzzle.kind === "cards") {
    return {
      puzzle: generatedPuzzle,
      progress: {
        kind: "cards",
        cardStacks: generatedPuzzle.stacks.map(cloneStack),
        selectedCard: null,
        solitaireStats: { ...initialSolitaireStats },
        undoStack: [],
        redoStack: [],
      },
      statusMessage,
    };
  }

  if (generatedPuzzle.kind === "grid") {
    return {
      puzzle: generatedPuzzle,
      progress: {
        kind: "grid",
        cells: prepareGridCells(generatedPuzzle),
        selectedCell: null,
      },
      statusMessage,
    };
  }

  return { puzzle: generatedPuzzle, progress: { kind: "tiles" }, statusMessage };
};

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
