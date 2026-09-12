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
import { cloneGridHistoryState, makeEmptyGridHistoryState, type GridHistoryState } from "./gridHistory";
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
  gridHistory?: GridHistoryState;
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
  clues: puzzle.clues ? {
    rows: puzzle.clues.rows?.map((run) => [...run]),
    columns: puzzle.clues.columns?.map((run) => [...run]),
  } : undefined,
  cages: puzzle.cages?.map((cage) => ({
    ...cage,
    cells: cage.cells.map((cell) => ({ ...cell })),
  })),
  inequalities: puzzle.inequalities?.map((inequality) => ({
    lesser: { ...inequality.lesser },
    greater: { ...inequality.greater },
  })),
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
  if (session.kind === "cards") {
    return {
      kind: "cards",
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

  if (session.kind === "grid") {
    const history = cloneGridHistoryState({
      undoStack: session.progress.undoStack ?? [],
      redoStack: session.progress.redoStack ?? [],
    });
    return {
      kind: "grid",
      puzzle: cloneGridPuzzle(session.puzzle),
      progress: {
        kind: "grid",
        cells: session.progress.cells.map(cloneGridCell),
        selectedCell: session.progress.selectedCell ? { ...session.progress.selectedCell } : null,
        undoStack: history.undoStack,
        redoStack: history.redoStack,
      },
      statusMessage: session.statusMessage,
    };
  }

  return {
    kind: "tiles",
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
  gridHistory,
  statusMessage,
}: RuntimeSessionDraft): PuzzleSession => {
  if (puzzle.kind === "cards") {
    return {
      kind: "cards",
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
    const history = cloneGridHistoryState(gridHistory ?? makeEmptyGridHistoryState());
    return {
      kind: "grid",
      puzzle,
      progress: {
        kind: "grid",
        cells: (gridCells ?? prepareGridCells(puzzle)).map((cell) => cloneSessionGridCell(puzzle.puzzleId, cell)),
        selectedCell: selectedGridCell ? { ...selectedGridCell } : null,
        undoStack: history.undoStack,
        redoStack: history.redoStack,
      },
      statusMessage,
    };
  }

  return {
    kind: "tiles",
    puzzle,
    progress: { kind: "tiles" },
    statusMessage,
  };
};

export const buildFreshSessionForGeneratedPuzzle = (generatedPuzzle: GeneratedPuzzle, statusMessage: string): PuzzleSession => {
  if (generatedPuzzle.kind === "cards") {
    return {
      kind: "cards",
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
      kind: "grid",
      puzzle: generatedPuzzle,
      progress: {
        kind: "grid",
        cells: prepareGridCells(generatedPuzzle),
        selectedCell: null,
        undoStack: [],
        redoStack: [],
      },
      statusMessage,
    };
  }

  return { kind: "tiles", puzzle: generatedPuzzle, progress: { kind: "tiles" }, statusMessage };
};

export const usePuzzleSessions = () => {
  const persistedSessionCache = useRef<PersistedPuzzleSessionCache>({});
  const sessionCache = useRef<PuzzleSessionCache>({});

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

  const restorePersistedSession = (puzzleId: PuzzleId, expectedPuzzle?: GeneratedPuzzle) => {
    const persistedSession = persistedSessionCache.current[puzzleId];
    if (!persistedSession) return null;
    const restoredSession = restorePuzzleSessionFromPersisted(persistedSession, expectedPuzzle);
    if (!restoredSession) return null;
    sessionCache.current[puzzleId] = clonePuzzleSession(restoredSession);
    return clonePuzzleSession(restoredSession);
  };

  return {
    saveSession,
    getCachedSession,
    initializePersistedSessions,
    restorePersistedSession,
  };
};
