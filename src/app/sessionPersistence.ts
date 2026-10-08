import type { GeneratedPuzzle, GridGeneratedPuzzle, PuzzleCell, PuzzleId } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import { prepareGridCells, type GridCellSelection } from "../interactions/gridRules";
import {
  buildPersistedCardStack,
  buildPersistedSolitaireHistory,
  cloneCardStack,
  clonePersistedCardStack,
  isPersistedCardStack,
  isValidCardSelectionForStacks,
  restorePersistedCardStacks,
  restorePersistedSolitaireHistory,
  trimPersistedSolitaireHistory,
  type PersistedCardStack,
  type PersistedSolitaireHistoryEntry,
} from "./cardPersistence";
import { cloneGridHistoryState, gridHistoryLimit, type GridHistoryEntry } from "./gridHistory";
import { decodeGenerationId, makePuzzleResourceKey, type PuzzleResourceIdentity, type PuzzleResourceKey } from "./puzzleResourceIdentity";
import { puzzleIds } from "./sessionConstants";
import type { PuzzleSession, SolitaireStats } from "./session";
import {
  cloneJigsawAssemblyProgress,
  normalizeJigsawAssemblyProgress,
  parseJigsawAssemblyProgress,
  type JigsawAssemblyProgress,
} from "../games/jigsaw/assembly";

const persistenceMetadataStorageKey = "puzzle-forge.sessions";
const persistenceSessionStorageKeyPrefix = "puzzle-forge.session.";
const puzzleCellTones = ["given", "empty", "accent", "answer", "hint", "disabled"] as const satisfies readonly PuzzleCell["tone"][];

type TileGeneratedPuzzle = Extract<GeneratedPuzzle, { kind: "tiles" }>;

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
  jigsawAssembly?: JigsawAssemblyProgress;
};

export type PersistedCompactGridHistoryEntry = {
  values: string[];
  selectedCellIndex: number | null;
};

export type PersistedCompactGridHistory = {
  undo: PersistedCompactGridHistoryEntry[];
  redo: PersistedCompactGridHistoryEntry[];
};

export type PersistedGridProgress = {
  kind: "grid";
  cells: PuzzleCell[];
  selectedCell: GridCellSelection | null;
  history?: PersistedCompactGridHistory;
};

export type PersistedPuzzleProgress = PersistedCardProgress | PersistedTileProgress | PersistedGridProgress;

export type PersistedPuzzleSession = {
  puzzleId: PuzzleId;
  generationId: string;
  baselineChecksum: string;
  progress: PersistedPuzzleProgress;
  updatedAt: string;
  completedAt?: string;
};

export type PersistedPuzzleSessionCache = Partial<Record<PuzzleResourceKey, PersistedPuzzleSession>>;
export type RuntimePuzzleSessionCache = Partial<Record<PuzzleResourceKey, PuzzleSession>>;

export type RuntimePuzzleSessions = {
  activeResourceKey: PuzzleResourceKey;
  sessions: RuntimePuzzleSessionCache;
};

export type PersistedPuzzleSessions = {
  activeResourceKey: PuzzleResourceKey;
  sessions: PersistedPuzzleSessionCache;
};

type PersistedPuzzleSessionMetadata = {
  activeResourceKey: string;
  savedResourceKeys: string[];
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isNonNegativeInteger = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0;
const isPuzzleId = (value: unknown): value is PuzzleId => typeof value === "string" && puzzleIds.includes(value as PuzzleId);
const isPuzzleCellTone = (value: unknown): value is PuzzleCell["tone"] =>
  typeof value === "string" && puzzleCellTones.includes(value as PuzzleCell["tone"]);
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
  isSolitaireStats(value.solitaireStats);
const isPersistedCompactGridHistoryEntry = (value: unknown): value is PersistedCompactGridHistoryEntry =>
  isRecord(value) &&
  Array.isArray(value.values) &&
  value.values.every((cellValue) => typeof cellValue === "string") &&
  (value.selectedCellIndex === null || isNonNegativeInteger(value.selectedCellIndex));
const isPersistedCompactGridHistory = (value: unknown): value is PersistedCompactGridHistory =>
  isRecord(value) &&
  Array.isArray(value.undo) &&
  value.undo.length <= gridHistoryLimit &&
  value.undo.every(isPersistedCompactGridHistoryEntry) &&
  Array.isArray(value.redo) &&
  value.redo.length <= gridHistoryLimit &&
  value.redo.every(isPersistedCompactGridHistoryEntry);

const cloneGridCell = (cell: PuzzleCell): PuzzleCell => ({ ...cell });
const gridCellKey = ({ row, column }: GridCellSelection) => `${row}:${column}`;

const getMutableGridCellIndexes = (baselineCells: PuzzleCell[]) =>
  baselineCells.reduce<number[]>((indexes, cell, index) => {
    if (!cell.locked) indexes.push(index);
    return indexes;
  }, []);

const getGridCellIndex = (cells: PuzzleCell[], selection: GridCellSelection | null) => {
  if (!selection) return null;
  const index = cells.findIndex((cell) => cell.row === selection.row && cell.column === selection.column);
  return index >= 0 ? index : null;
};

const buildPersistedCompactGridHistoryEntry = (
  entry: GridHistoryEntry,
  baselineCells: PuzzleCell[],
  mutableCellIndexes: number[],
): PersistedCompactGridHistoryEntry => ({
  values: mutableCellIndexes.map((index) => entry.cells[index]?.value ?? ""),
  selectedCellIndex: getGridCellIndex(baselineCells, entry.selectedGridCell),
});

const buildPersistedCompactGridHistory = (
  history: { undoStack: GridHistoryEntry[]; redoStack: GridHistoryEntry[] },
  baselineCells: PuzzleCell[],
): PersistedCompactGridHistory => {
  const normalized = cloneGridHistoryState(history);
  const mutableCellIndexes = getMutableGridCellIndexes(baselineCells);
  return {
    undo: normalized.undoStack.map((entry) => buildPersistedCompactGridHistoryEntry(entry, baselineCells, mutableCellIndexes)),
    redo: normalized.redoStack.map((entry) => buildPersistedCompactGridHistoryEntry(entry, baselineCells, mutableCellIndexes)),
  };
};

const clonePersistedCompactGridHistory = (history: PersistedCompactGridHistory): PersistedCompactGridHistory => ({
  undo: history.undo.map((entry) => ({ values: [...entry.values], selectedCellIndex: entry.selectedCellIndex })),
  redo: history.redo.map((entry) => ({ values: [...entry.values], selectedCellIndex: entry.selectedCellIndex })),
});

const buildPersistedPuzzleProgress = (session: PuzzleSession): PersistedPuzzleProgress => {
  if (session.kind === "cards") {
    return {
      kind: "cards",
      stacks: session.progress.cardStacks.map(buildPersistedCardStack),
      selectedCard: session.progress.selectedCard ? { ...session.progress.selectedCard } : null,
      stats: { ...session.progress.solitaireStats },
      undoStack: buildPersistedSolitaireHistory(session.progress.undoStack),
      redoStack: buildPersistedSolitaireHistory(session.progress.redoStack),
    };
  }

  if (session.kind === "tiles") {
    return {
      kind: "tiles",
      tileOrder: session.puzzle.tiles.map(({ id, currentIndex }) => ({ id, currentIndex })),
      selectedTileId: null,
      ...(session.puzzle.puzzleId === "jigsaw" && session.progress.jigsawAssembly
        ? { jigsawAssembly: normalizeJigsawAssemblyProgress(session.progress.jigsawAssembly) }
        : {}),
    };
  }

  const baselineCells = prepareGridCells(session.puzzle);
  const history = buildPersistedCompactGridHistory({
    undoStack: session.progress.undoStack ?? [],
    redoStack: session.progress.redoStack ?? [],
  }, baselineCells);
  return {
    kind: "grid",
    cells: session.progress.cells.map(cloneGridCell),
    selectedCell: session.progress.selectedCell ? { ...session.progress.selectedCell } : null,
    ...(history.undo.length > 0 || history.redo.length > 0 ? { history } : {}),
  };
};

export const buildPersistedPuzzleSession = (
  resource: PuzzleResourceIdentity,
  session: PuzzleSession,
): PersistedPuzzleSession | null => {
  if (session.puzzle.puzzleId !== resource.puzzleId || !resource.generationId) return null;
  if (
    session.puzzle.puzzleId === "jigsaw" &&
    (
      session.kind !== "tiles" ||
      session.progress.jigsawAssembly === undefined ||
      parseJigsawAssemblyProgress(session.progress.jigsawAssembly, session.puzzle.tiles) === null
    )
  ) return null;

  return {
    puzzleId: resource.puzzleId,
    generationId: resource.generationId,
    baselineChecksum: session.puzzle.checksum,
    progress: buildPersistedPuzzleProgress(session),
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
  (value.selectedTileId === null || typeof value.selectedTileId === "string") &&
  (value.jigsawAssembly === undefined || (
    isRecord(value.jigsawAssembly) &&
    Array.isArray(value.jigsawAssembly.joinedComponents) &&
    value.jigsawAssembly.joinedComponents.every((component) =>
      Array.isArray(component) && component.every((pieceId) => typeof pieceId === "string"))
  ));

const isPersistedGridProgress = (value: Record<string, unknown>): value is PersistedGridProgress =>
  Array.isArray(value.cells) &&
  value.cells.every(isPuzzleCell) &&
  isGridCellSelection(value.selectedCell) &&
  (value.history === undefined || isPersistedCompactGridHistory(value.history));

const isPersistedPuzzleProgress = (value: unknown): value is PersistedPuzzleProgress => {
  if (!isRecord(value)) return false;
  if (value.kind === "cards") return isPersistedCardProgress(value);
  if (value.kind === "tiles") return isPersistedTileProgress(value);
  return value.kind === "grid" && isPersistedGridProgress(value);
};

const isPersistedPuzzleSession = (value: unknown): value is PersistedPuzzleSession => {
  if (
    !isRecord(value) ||
    !isPuzzleId(value.puzzleId) ||
    typeof value.generationId !== "string" ||
    value.generationId.length === 0 ||
    typeof value.baselineChecksum !== "string" ||
    value.baselineChecksum.length === 0 ||
    typeof value.updatedAt !== "string" ||
    (value.completedAt !== undefined && typeof value.completedAt !== "string") ||
    !isPersistedPuzzleProgress(value.progress)
  ) return false;

  const progress = value.progress as PersistedPuzzleProgress;
  if (value.puzzleId === "jigsaw") {
    if (progress.kind !== "tiles" || progress.jigsawAssembly === undefined) return false;
  } else if (progress.kind === "tiles" && progress.jigsawAssembly !== undefined) {
    return false;
  }

  return decodeGenerationId(value.puzzleId, value.generationId).ok;
};

const isStoredResourceKey = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const isPersistedPuzzleSessionMetadata = (value: unknown): value is PersistedPuzzleSessionMetadata =>
  isRecord(value) &&
  isStoredResourceKey(value.activeResourceKey) &&
  Array.isArray(value.savedResourceKeys) &&
  value.savedResourceKeys.every(isStoredResourceKey) &&
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
      ...(progress.jigsawAssembly
        ? { jigsawAssembly: cloneJigsawAssemblyProgress(progress.jigsawAssembly) }
        : {}),
    };
  }

  return {
    kind: "grid",
    cells: progress.cells.map(cloneGridCell),
    selectedCell: progress.selectedCell ? { ...progress.selectedCell } : null,
    ...(progress.history ? { history: clonePersistedCompactGridHistory(progress.history) } : {}),
  };
};

export const clonePersistedPuzzleSession = (session: PersistedPuzzleSession): PersistedPuzzleSession => ({
  ...session,
  progress: clonePersistedPuzzleProgress(session.progress),
});

const restoreGridCell = (puzzle: GridGeneratedPuzzle, baseline: PuzzleCell, persistedValue: string): PuzzleCell => {
  if (baseline.locked) return cloneGridCell(baseline);
  if (puzzle.puzzleId === "nonogram") {
    return {
      ...baseline,
      value: persistedValue,
      tone: persistedValue === "■" ? "accent" : "empty",
      ariaLabel: `${persistedValue === "■" ? "Filled" : "Empty"} nonogram cell at row ${baseline.row + 1}, column ${baseline.column + 1}`,
    };
  }
  return {
    ...baseline,
    value: persistedValue,
    tone: "empty",
    ariaLabel: `${persistedValue || "Empty"} cell at row ${baseline.row + 1}, column ${baseline.column + 1}`,
  };
};

const restorePersistedGridSnapshot = (
  puzzle: GridGeneratedPuzzle,
  cellsToRestore: PuzzleCell[],
  selectedCell: GridCellSelection | null,
  baselineCells: PuzzleCell[],
) => {
  if (cellsToRestore.length !== baselineCells.length) return null;

  const persistedCells = new Map<string, PuzzleCell>();
  for (const cell of cellsToRestore) {
    const key = gridCellKey(cell);
    if (persistedCells.has(key)) return null;
    persistedCells.set(key, cell);
  }

  const cells: PuzzleCell[] = [];
  for (const baseline of baselineCells) {
    const persisted = persistedCells.get(gridCellKey(baseline));
    if (!persisted) return null;
    if (baseline.locked && (!persisted.locked || persisted.value !== baseline.value)) return null;
    cells.push(restoreGridCell(puzzle, baseline, persisted.value));
  }

  if (persistedCells.size !== baselineCells.length) return null;
  if (selectedCell && !persistedCells.has(gridCellKey(selectedCell))) return null;

  return {
    cells,
    selectedGridCell: selectedCell ? { ...selectedCell } : null,
  };
};

const restorePersistedCompactGridHistoryEntry = (
  entry: PersistedCompactGridHistoryEntry,
  puzzle: GridGeneratedPuzzle,
  baselineCells: PuzzleCell[],
  mutableCellIndexes: number[],
): GridHistoryEntry | null => {
  if (entry.values.length !== mutableCellIndexes.length) return null;
  if (entry.selectedCellIndex !== null && entry.selectedCellIndex >= baselineCells.length) return null;

  const cells = baselineCells.map(cloneGridCell);
  for (let valueIndex = 0; valueIndex < mutableCellIndexes.length; valueIndex += 1) {
    const cellIndex = mutableCellIndexes[valueIndex];
    const baseline = baselineCells[cellIndex];
    const value = entry.values[valueIndex];
    if (!baseline || value === undefined) return null;
    cells[cellIndex] = restoreGridCell(puzzle, baseline, value);
  }

  const selected = entry.selectedCellIndex === null ? null : baselineCells[entry.selectedCellIndex];
  return {
    cells,
    selectedGridCell: selected ? { row: selected.row, column: selected.column } : null,
  };
};

const restorePersistedGridProgress = (progress: PersistedGridProgress, puzzle: GridGeneratedPuzzle) => {
  const baselineCells = prepareGridCells(puzzle);
  const current = restorePersistedGridSnapshot(puzzle, progress.cells, progress.selectedCell, baselineCells);
  if (!current) return null;

  const mutableCellIndexes = getMutableGridCellIndexes(baselineCells);
  const restoreCompactHistoryStack = (entries: PersistedCompactGridHistoryEntry[]) => {
    const restored: GridHistoryEntry[] = [];
    for (const entry of entries) {
      const snapshot = restorePersistedCompactGridHistoryEntry(entry, puzzle, baselineCells, mutableCellIndexes);
      if (!snapshot) return null;
      restored.push(snapshot);
    }
    return restored;
  };

  const undoStack = restoreCompactHistoryStack(progress.history?.undo ?? []);
  const redoStack = restoreCompactHistoryStack(progress.history?.redo ?? []);
  if (!undoStack || !redoStack) return null;

  return {
    cells: current.cells,
    selectedCell: current.selectedGridCell,
    undoStack,
    redoStack,
  };
};

const restorePersistedJigsawAssembly = (
  progress: PersistedTileProgress,
  puzzle: TileGeneratedPuzzle,
): JigsawAssemblyProgress | undefined | null => {
  if (puzzle.puzzleId !== "jigsaw") {
    return progress.jigsawAssembly === undefined ? undefined : null;
  }

  if (progress.jigsawAssembly === undefined) return null;
  return parseJigsawAssemblyProgress(progress.jigsawAssembly, puzzle.tiles);
};

const restorePersistedTilePuzzle = (progress: PersistedTileProgress, puzzle: TileGeneratedPuzzle): TileGeneratedPuzzle | null => {
  const boardCellCount = puzzle.width * puzzle.height;
  const expectedTileCount = puzzle.puzzleId === "jigsaw"
    ? puzzle.tiles.length
    : puzzle.puzzleId === "sliding-puzzle"
      ? boardCellCount - 1
      : boardCellCount;
  if (progress.tileOrder.length !== expectedTileCount) return null;
  if (puzzle.puzzleId !== "jigsaw" && puzzle.tiles.length !== expectedTileCount) return null;

  const currentIndexCount = puzzle.puzzleId === "jigsaw"
    ? expectedTileCount
    : boardCellCount;
  const tileIndexes = new Map<string, number>();
  const usedIndexes = new Set<number>();
  for (const { id, currentIndex } of progress.tileOrder) {
    if (tileIndexes.has(id) || currentIndex >= currentIndexCount || usedIndexes.has(currentIndex)) return null;
    tileIndexes.set(id, currentIndex);
    usedIndexes.add(currentIndex);
  }

  if (puzzle.tiles.some((tile) => !tileIndexes.has(tile.id))) return null;

  if (puzzle.puzzleId === "jigsaw") {
    return {
      ...puzzle,
      tiles: puzzle.tiles.map((tile) => ({
        ...tile,
        currentIndex: tileIndexes.get(tile.id) ?? tile.currentIndex,
      })),
    };
  }

  const tiles = puzzle.tiles.map((tile) => ({ ...tile, currentIndex: tileIndexes.get(tile.id) ?? tile.currentIndex }));
  if (puzzle.puzzleId === "sliding-puzzle") {
    const emptyIndex = Array.from({ length: boardCellCount }, (_, index) => index).find((index) => !usedIndexes.has(index));
    if (emptyIndex === undefined) return null;
    return { ...puzzle, tiles, emptyIndex };
  }

  return { ...puzzle, tiles };
};

export const restorePuzzleSessionFromPersisted = (
  persisted: PersistedPuzzleSession,
  generatedPuzzle: GeneratedPuzzle,
): PuzzleSession | null => {
  if (
    generatedPuzzle.puzzleId !== persisted.puzzleId ||
    generatedPuzzle.checksum !== persisted.baselineChecksum
  ) return null;

  if (persisted.progress.kind === "cards" && generatedPuzzle.kind === "cards") {
    const stacks = restorePersistedCardStacks(persisted.progress.stacks, generatedPuzzle.stacks);
    const undoStack = restorePersistedSolitaireHistory(persisted.progress.undoStack, generatedPuzzle.stacks);
    const redoStack = restorePersistedSolitaireHistory(persisted.progress.redoStack, generatedPuzzle.stacks);
    if (!stacks || !undoStack || !redoStack || !isValidCardSelectionForStacks(persisted.progress.selectedCard, stacks)) return null;

    return {
      kind: "cards",
      puzzle: { ...generatedPuzzle, stacks: generatedPuzzle.stacks.map(cloneCardStack) },
      progress: {
        kind: "cards",
        cardStacks: stacks,
        selectedCard: persisted.progress.selectedCard ? { ...persisted.progress.selectedCard } : null,
        solitaireStats: { ...persisted.progress.stats },
        undoStack,
        redoStack,
      },
    };
  }

  if (persisted.progress.kind === "tiles" && generatedPuzzle.kind === "tiles") {
    const restoredPuzzle = restorePersistedTilePuzzle(persisted.progress, generatedPuzzle);
    const jigsawAssembly = restorePersistedJigsawAssembly(persisted.progress, generatedPuzzle);
    if (!restoredPuzzle || jigsawAssembly === null) return null;
    return {
      kind: "tiles",
      puzzle: restoredPuzzle,
      progress: {
        kind: "tiles",
        ...(jigsawAssembly ? { jigsawAssembly } : {}),
      },
    };
  }

  if (persisted.progress.kind === "grid" && generatedPuzzle.kind === "grid") {
    const restoredProgress = restorePersistedGridProgress(persisted.progress, generatedPuzzle);
    if (!restoredProgress) return null;
    return {
      kind: "grid",
      puzzle: generatedPuzzle,
      progress: { kind: "grid", ...restoredProgress },
    };
  }

  return null;
};

const sessionStorageKey = (resourceKey: string) =>
  `${persistenceSessionStorageKeyPrefix}${resourceKey}`;

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

const readPersistedSession = (resourceKey: string): PersistedPuzzleSession | null => {
  const rawSession = window.localStorage.getItem(sessionStorageKey(resourceKey));
  if (!rawSession) return null;

  try {
    const session: unknown = JSON.parse(rawSession);
    if (!isPersistedPuzzleSession(session)) return null;
    return makePuzzleResourceKey(session.puzzleId, session.generationId) === resourceKey
      ? clonePersistedPuzzleSession(session)
      : null;
  } catch {
    return null;
  }
};

const comparePersistedSessionRecency = (
  left: [PuzzleResourceKey, PersistedPuzzleSession],
  right: [PuzzleResourceKey, PersistedPuzzleSession],
) => {
  const updatedAtOrder = right[1].updatedAt.localeCompare(left[1].updatedAt);
  return updatedAtOrder !== 0 ? updatedAtOrder : left[0].localeCompare(right[0]);
};

const repairPersistedPuzzleSessionMetadata = (
  metadata: PersistedPuzzleSessionMetadata,
  activeResourceKey: PuzzleResourceKey | null,
  sessions: PersistedPuzzleSessionCache,
) => {
  const retainedResourceKeys = Object.keys(sessions) as PuzzleResourceKey[];
  const retained = new Set<string>(retainedResourceKeys);

  try {
    for (const resourceKey of new Set([metadata.activeResourceKey, ...metadata.savedResourceKeys])) {
      if (!retained.has(resourceKey)) window.localStorage.removeItem(sessionStorageKey(resourceKey));
    }

    if (!activeResourceKey) {
      window.localStorage.removeItem(persistenceMetadataStorageKey);
      return;
    }

    const metadataChanged =
      activeResourceKey !== metadata.activeResourceKey ||
      retainedResourceKeys.length !== metadata.savedResourceKeys.length ||
      retainedResourceKeys.some((resourceKey, index) => resourceKey !== metadata.savedResourceKeys[index]);

    if (metadataChanged) {
      window.localStorage.setItem(persistenceMetadataStorageKey, JSON.stringify({
        activeResourceKey,
        savedResourceKeys: retainedResourceKeys,
        updatedAt: metadata.updatedAt,
      } satisfies PersistedPuzzleSessionMetadata));
    }
  } catch {
    // Persistence cleanup is best-effort; valid in-memory sessions remain usable.
  }
};

export const loadPersistedPuzzleSessions = (): PersistedPuzzleSessions | null => {
  if (typeof window === "undefined") return null;

  const metadata = readPersistedMetadata();
  if (!metadata) return null;

  const sessions: PersistedPuzzleSessionCache = {};
  for (const resourceKey of new Set([metadata.activeResourceKey, ...metadata.savedResourceKeys])) {
    const session = readPersistedSession(resourceKey);
    if (session) sessions[resourceKey as PuzzleResourceKey] = session;
  }

  const requestedActiveResourceKey = metadata.activeResourceKey as PuzzleResourceKey;
  const activeResourceKey = sessions[requestedActiveResourceKey]
    ? requestedActiveResourceKey
    : (Object.entries(sessions) as Array<[PuzzleResourceKey, PersistedPuzzleSession]>)
        .sort(comparePersistedSessionRecency)[0]?.[0] ?? null;

  repairPersistedPuzzleSessionMetadata(metadata, activeResourceKey, sessions);
  return activeResourceKey ? { activeResourceKey, sessions } : null;
};

export const savePersistedPuzzleSessions = ({ activeResourceKey, sessions }: RuntimePuzzleSessions) => {
  if (typeof window === "undefined") return;

  const previousSavedResourceKeys = readPersistedMetadata()?.savedResourceKeys ?? [];
  const savedResourceKeys = new Set(previousSavedResourceKeys);
  const activeSession = sessions[activeResourceKey];
  if (!activeSession) return;

  const separator = activeResourceKey.indexOf("/");
  if (separator <= 0 || separator === activeResourceKey.length - 1) return;
  const puzzleId = activeResourceKey.slice(0, separator) as PuzzleId;
  const generationId = activeResourceKey.slice(separator + 1);
  const persistedActiveSession = buildPersistedPuzzleSession({ puzzleId, generationId }, activeSession);

  if (persistedActiveSession) {
    savedResourceKeys.add(activeResourceKey);
    window.localStorage.setItem(sessionStorageKey(activeResourceKey), JSON.stringify(persistedActiveSession));
  } else {
    savedResourceKeys.delete(activeResourceKey);
    window.localStorage.removeItem(sessionStorageKey(activeResourceKey));
  }

  const metadata: PersistedPuzzleSessionMetadata = {
    activeResourceKey,
    savedResourceKeys: [...savedResourceKeys],
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(persistenceMetadataStorageKey, JSON.stringify(metadata));
};

export const clearPersistedPuzzleSessions = () => {
  if (typeof window === "undefined") return;
  const metadata = readPersistedMetadata();
  if (metadata) {
    for (const resourceKey of metadata.savedResourceKeys) {
      window.localStorage.removeItem(sessionStorageKey(resourceKey));
    }
  }
  window.localStorage.removeItem(persistenceMetadataStorageKey);
};
