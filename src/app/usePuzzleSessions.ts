import { cloneCrosswordProgress, createCrosswordProgress, restoreCrosswordProgress, type CrosswordProgress } from "../games/crossword/progress";
import { createWordSearchProgress, restoreWordSearchProgress, type WordSearchProgress } from "../games/wordSearch/progress";
import { useRef } from "preact/hooks";
import type { CardGeneratedPuzzle, CardStack, GeneratedPuzzle, GridGeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";
import { cloneStack, type CardSelection } from "../interactions/cardRules";
import { cloneGridCell, prepareGridCells, type GridCellSelection } from "../interactions/gridRules";
import {
  getMostRecentPersistedPuzzleSession,
  initialSolitaireStats,
  restorePuzzleSessionFromPersisted,
  savePersistedPuzzleSessions,
  solitaireHistoryLimit,
  type PersistedPuzzleSessionCache,
  type PersistedPuzzleSessions,
  type PuzzleSession,
  type RuntimePuzzleSessionCache,
  type SolitaireHistoryEntry,
  type SolitaireStats,
} from "./session";
import { cloneGridHistoryState, makeEmptyGridHistoryState, type GridHistoryState } from "./gridHistory";
import { makePuzzleResourceKey, type PuzzleResourceIdentity } from "./puzzleResourceIdentity";
import { cloneSolitaireHistoryEntry } from "./solitaireHistory";
import { cloneImageTileActionRuntime, type ImageTileActionRuntime } from "../games/imageTiles/history";
import { cloneJigsawActionRuntime, type JigsawActionRuntime } from "../games/jigsaw/history";

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
  jigsawRuntime?: JigsawActionRuntime | null;
  imageTileRuntime?: ImageTileActionRuntime | null;
  wordSearchProgress?: WordSearchProgress | null;
  crosswordProgress?: CrosswordProgress | null;
};

const cloneSessionGridCell = (puzzleId: PuzzleId, cell: PuzzleCell): PuzzleCell => {
  const clonedCell = cloneGridCell(cell);
  if (clonedCell.locked || clonedCell.tone === "disabled") return clonedCell;

  if ((puzzleId === "sudoku" || puzzleId === "futoshiki") && (clonedCell.tone === "answer" || clonedCell.tone === "hint")) {
    return { ...clonedCell, tone: "empty" };
  }

  if (puzzleId === "nonogram" && clonedCell.tone === "hint") {
    return { ...clonedCell, tone: clonedCell.value === "■" ? "accent" : "empty" };
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

const cloneTilePuzzle = (puzzle: Extract<GeneratedPuzzle, { kind: "tiles" }>) => {
  if (puzzle.puzzleId === "jigsaw") {
    return {
      ...puzzle,
      tiles: puzzle.tiles.map((tile) => ({ ...tile, edges: tile.edges.map((edge) => ({ ...edge })) })),
      asset: { ...puzzle.asset, files: { ...puzzle.asset.files }, credit: { ...puzzle.asset.credit } },
      edgeModel: {
        ...puzzle.edgeModel,
        baselineCourseIds: [...puzzle.edgeModel.baselineCourseIds],
      },
    };
  }

  return {
    ...puzzle,
    tiles: puzzle.tiles.map((tile) => ({ ...tile })),
    asset: { ...puzzle.asset, files: { ...puzzle.asset.files }, credit: { ...puzzle.asset.credit } },
  };
};

export const clonePuzzleSession = (session: PuzzleSession): PuzzleSession => {
  if (session.kind === "crossword") return {
    kind: "crossword",
    puzzle: { ...session.puzzle, blocks: [...session.puzzle.blocks], numbers: [...session.puzzle.numbers],
      entries: session.puzzle.entries.map(entry => ({ ...entry, cells: [...entry.cells] })) },
    progress: { kind: "crossword", ...cloneCrosswordProgress(session.progress) },
  };
  if (session.kind === "word-search") return {
    kind: "word-search",
    puzzle: { ...session.puzzle, letters: [...session.puzzle.letters], targets: session.puzzle.targets.map(target => ({ ...target })) },
    progress: { ...session.progress, found: [...session.progress.found] },
  };
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
    };
  }

  return {
    kind: "tiles",
    puzzle: cloneTilePuzzle(session.puzzle),
    progress: {
      kind: "tiles",
      ...(session.progress.jigsawRuntime
        ? { jigsawRuntime: cloneJigsawActionRuntime(session.progress.jigsawRuntime) }
        : {}),
      ...(session.progress.imageTileRuntime
        ? { imageTileRuntime: cloneImageTileActionRuntime(session.progress.imageTileRuntime) }
        : {}),
    },
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
  jigsawRuntime,
  imageTileRuntime,
  wordSearchProgress,
  crosswordProgress,
}: RuntimeSessionDraft): PuzzleSession => {
  if (puzzle.kind === "crossword") {
    const progress = restoreCrosswordProgress(puzzle, crosswordProgress) ?? createCrosswordProgress(puzzle);
    return { kind: "crossword", puzzle, progress: { kind: "crossword", ...progress } };
  }
  if (puzzle.kind === "word-search") {
    const progress = restoreWordSearchProgress(puzzle, wordSearchProgress) ?? createWordSearchProgress(puzzle);
    return { kind: "word-search", puzzle, progress: { kind: "word-search", ...progress } };
  }
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
    };
  }

  return {
    kind: "tiles",
    puzzle,
    progress: {
      kind: "tiles",
      ...(puzzle.puzzleId === "jigsaw" && jigsawRuntime
        ? { jigsawRuntime }
        : {}),
      ...(puzzle.puzzleId !== "jigsaw" && imageTileRuntime
        ? { imageTileRuntime: cloneImageTileActionRuntime(imageTileRuntime) }
        : {}),
    },
  };
};

export const buildFreshSessionForGeneratedPuzzle = (generatedPuzzle: GeneratedPuzzle): PuzzleSession => {
  if (generatedPuzzle.kind === "crossword") return { kind: "crossword", puzzle: generatedPuzzle, progress: { kind: "crossword", ...createCrosswordProgress(generatedPuzzle) } };
  if (generatedPuzzle.kind === "word-search") return { kind: "word-search", puzzle: generatedPuzzle, progress: { kind: "word-search", ...createWordSearchProgress(generatedPuzzle) } };
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
    };
  }

  return {
    kind: "tiles",
    puzzle: generatedPuzzle,
    progress: {
      kind: "tiles",
    },
  };
};

export const createPuzzleSessionResumeIndex = (
  persisted: PersistedPuzzleSessions | null,
) => {
  const preferredResources = new Map<PuzzleId, PuzzleResourceIdentity>();
  const persistedPuzzleIds = new Set<PuzzleId>();

  for (const session of Object.values(persisted?.sessions ?? {})) {
    if (session) persistedPuzzleIds.add(session.puzzleId);
  }

  for (const puzzleId of persistedPuzzleIds) {
    const session = getMostRecentPersistedPuzzleSession(puzzleId, persisted);
    if (!session) continue;
    preferredResources.set(puzzleId, {
      puzzleId: session.puzzleId,
      generationId: session.generationId,
    });
  }

  return {
    remember: (resource: PuzzleResourceIdentity) => {
      preferredResources.set(resource.puzzleId, { ...resource });
    },
    get: (puzzleId: PuzzleId): PuzzleResourceIdentity | null => {
      const resource = preferredResources.get(puzzleId);
      return resource ? { ...resource } : null;
    },
  };
};

export const usePuzzleSessions = (initialPersistedSessions: PersistedPuzzleSessions | null = null) => {
  const persistedSessionCache = useRef<PersistedPuzzleSessionCache>({ ...initialPersistedSessions?.sessions });
  const sessionCache = useRef<RuntimePuzzleSessionCache>({});
  const resumeIndex = useRef(createPuzzleSessionResumeIndex(initialPersistedSessions));

  const saveSession = (resource: PuzzleResourceIdentity, session: PuzzleSession) => {
    const resourceKey = makePuzzleResourceKey(resource.puzzleId, resource.generationId);
    sessionCache.current[resourceKey] = clonePuzzleSession(session);
    resumeIndex.current.remember(resource);
    savePersistedPuzzleSessions({ activeResourceKey: resourceKey, sessions: sessionCache.current });
  };

  const getCachedSession = (resource: PuzzleResourceIdentity) => {
    const resourceKey = makePuzzleResourceKey(resource.puzzleId, resource.generationId);
    const session = sessionCache.current[resourceKey];
    return session ? clonePuzzleSession(session) : null;
  };


  const restorePersistedSession = (resource: PuzzleResourceIdentity, generatedPuzzle: GeneratedPuzzle) => {
    const resourceKey = makePuzzleResourceKey(resource.puzzleId, resource.generationId);
    const persistedSession = persistedSessionCache.current[resourceKey];
    if (!persistedSession) return null;
    const restoredSession = restorePuzzleSessionFromPersisted(persistedSession, generatedPuzzle);
    if (!restoredSession) return null;
    sessionCache.current[resourceKey] = clonePuzzleSession(restoredSession);
    resumeIndex.current.remember(resource);
    return clonePuzzleSession(restoredSession);
  };

  return {
    saveSession,
    getCachedSession,
    restorePersistedSession,
    getPreferredResource: (puzzleId: PuzzleId) => resumeIndex.current.get(puzzleId),
  };
};