import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDifficulty, PuzzleId } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCellSelection } from "../interactions/gridRules";

const persistenceSchemaVersion = 1;
const persistenceStorageKey = "puzzle-forge.sessions.v1";

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
  gridCells: PuzzleCell[] | null;
  selectedGridCell: GridCellSelection | null;
  statusMessage: string;
};

export type PuzzleSessionCache = Partial<Record<PuzzleId, PuzzleSession>>;

export type PersistedPuzzleSessions = {
  activePuzzleId: PuzzleId;
  sessions: PuzzleSessionCache;
};

type PersistedPuzzleSessionEnvelope = PersistedPuzzleSessions & {
  schemaVersion: typeof persistenceSchemaVersion;
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const isPuzzleId = (value: unknown): value is PuzzleId => typeof value === "string" && puzzleIds.includes(value as PuzzleId);

const isSolitaireStats = (value: unknown): value is SolitaireStats =>
  isRecord(value) &&
  typeof value.moveCount === "number" &&
  typeof value.drawCount === "number" &&
  typeof value.recycleCount === "number" &&
  typeof value.autoMoveCount === "number";

const isPuzzleSession = (value: unknown): value is PuzzleSession =>
  isRecord(value) &&
  typeof value.seed === "string" &&
  typeof value.width === "number" &&
  typeof value.height === "number" &&
  typeof value.difficulty === "string" &&
  typeof value.requireUniqueSolution === "boolean" &&
  isSolitaireStats(value.solitaireStats) &&
  typeof value.statusMessage === "string";

const cloneGridCell = (cell: PuzzleCell): PuzzleCell => ({ ...cell });

const cloneCardStack = (stack: CardStack): CardStack => ({
  ...stack,
  cards: stack.cards.map((card) => ({ ...card })),
});

const clonePuzzleWithoutSolutionKeys = (puzzle: GeneratedPuzzle | null): GeneratedPuzzle | null => {
  if (!puzzle) {
    return null;
  }

  if (puzzle.kind === "grid") {
    const { answerKey: _answerKey, ...persistedPuzzle } = puzzle;

    return {
      ...persistedPuzzle,
      cells: puzzle.cells.map(cloneGridCell),
      clues: puzzle.clues
        ? {
            rows: puzzle.clues.rows?.map((row) => [...row]),
            columns: puzzle.clues.columns?.map((column) => [...column]),
          }
        : undefined,
    };
  }

  if (puzzle.kind === "cards") {
    return {
      ...puzzle,
      stacks: puzzle.stacks.map(cloneCardStack),
    };
  }

  return {
    ...puzzle,
    tiles: puzzle.tiles.map((tile) => ({ ...tile })),
    asset: { ...puzzle.asset, palette: [...puzzle.asset.palette] },
  };
};

export const cloneSessionForPersistence = (session: PuzzleSession): PuzzleSession => ({
  seed: session.seed,
  width: session.width,
  height: session.height,
  difficulty: session.difficulty,
  requireUniqueSolution: session.requireUniqueSolution,
  puzzle: clonePuzzleWithoutSolutionKeys(session.puzzle),
  cardStacks: session.cardStacks?.map(cloneCardStack) ?? null,
  selectedCard: session.selectedCard ? { ...session.selectedCard } : null,
  solitaireStats: { ...session.solitaireStats },
  gridCells: session.gridCells?.map(cloneGridCell) ?? null,
  selectedGridCell: session.selectedGridCell ? { ...session.selectedGridCell } : null,
  statusMessage: session.statusMessage,
});

export const loadPersistedPuzzleSessions = (): PersistedPuzzleSessions | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawEnvelope = window.localStorage.getItem(persistenceStorageKey);

  if (!rawEnvelope) {
    return null;
  }

  try {
    const envelope: unknown = JSON.parse(rawEnvelope);

    if (!isRecord(envelope) || envelope.schemaVersion !== persistenceSchemaVersion || !isPuzzleId(envelope.activePuzzleId) || !isRecord(envelope.sessions)) {
      return null;
    }

    const sessions: PuzzleSessionCache = {};

    for (const puzzleId of puzzleIds) {
      const candidate = envelope.sessions[puzzleId];

      if (isPuzzleSession(candidate)) {
        sessions[puzzleId] = cloneSessionForPersistence(candidate);
      }
    }

    if (!sessions[envelope.activePuzzleId]) {
      return null;
    }

    return {
      activePuzzleId: envelope.activePuzzleId,
      sessions,
    };
  } catch {
    return null;
  }
};

export const savePersistedPuzzleSessions = ({ activePuzzleId, sessions }: PersistedPuzzleSessions) => {
  if (typeof window === "undefined") {
    return;
  }

  const persistedSessions: PuzzleSessionCache = {};

  for (const puzzleId of puzzleIds) {
    const session = sessions[puzzleId];

    if (session) {
      persistedSessions[puzzleId] = cloneSessionForPersistence(session);
    }
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
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(persistenceStorageKey);
};
